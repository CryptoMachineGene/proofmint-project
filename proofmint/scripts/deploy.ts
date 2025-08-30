import { ethers, network, artifacts } from "hardhat";
import fs from "fs";
import path from "path";

type DeployMap = Record<string, string>;
type AbiInput = { name: string; type: string };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForTx(tx: any, label: string, timeoutMs = 180_000) {
  if (!tx) throw new Error(`${label}: missing tx object`);
  console.log(`  ${label} tx: ${tx.hash}`);
  const start = Date.now();
  while (true) {
    try {
      const rcpt = await tx.wait(1); // wait 1 confirmation
      console.log(`  ${label} mined in block ${rcpt.blockNumber}`);
      return rcpt;
    } catch (e: any) {
      // If still pending, loop with timeout
      if (Date.now() - start > timeoutMs) {
        throw new Error(`${label}: timed out after ${timeoutMs / 1000}s. Check the tx hash on a Sepolia explorer and re-run if needed.`);
      }
      await sleep(3500);
    }
  }
}

function saveDeployment(net: string, addrs: DeployMap) {
  const dir = path.join(__dirname, "..", "deployments");
  const file = path.join(dir, `${net}.json`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let existing: DeployMap = {};
  if (fs.existsSync(file)) existing = JSON.parse(fs.readFileSync(file, "utf8"));
  const merged = { ...existing, ...addrs };
  fs.writeFileSync(file, JSON.stringify(merged, null, 2));
  console.log(`\n📝 Saved deployments -> ${file}`);
}

function env(name: string, def?: string) {
  const v = process.env[name];
  return v ?? def;
}

async function buildArgs(
  contractName: string,
  inputs: AbiInput[],
  defaults: Record<string, string | (() => any)>
): Promise<any[]> {
  const args: any[] = [];
  for (const input of inputs) {
    const key = `${contractName.toUpperCase()}_${input.name.toUpperCase()}`; // e.g., TOKEN_NAME
    const fallbackKey = input.name.toUpperCase();                            // e.g., NAME
    let raw = env(key) ?? env(fallbackKey);

    // default by provided map, then by type
    let defVal = defaults[input.name];
    if (defVal === undefined) {
      if (input.type === "string") defVal = "";
      else if (input.type.startsWith("uint")) defVal = "0";
      else defVal = "";
    }
    if (raw === undefined) raw = typeof defVal === "function" ? (defVal as any)() : defVal;

    // convert by type
    let val: any = raw;
    if (input.type.startsWith("uint")) {
      // If looks like an ETH amount or common money param, parse as ether unless it's already long wei
      if (/_ETH$/.test(input.name) || /amount|cap|supply/i.test(input.name)) {
        const s = String(raw);
        val =
          /^[0-9]+$/.test(s) && s.length > 18
            ? ethers.toBigInt(s)
            : ethers.parseEther(s);
      } else {
        val = ethers.toBigInt(String(raw));
      }
    } else if (input.type === "address") {
      val = String(raw);
    } else if (input.type === "string") {
      val = String(raw);
    } else {
      val = raw;
    }

    args.push(val);
  }
  return args;
}

async function deployToken(): Promise<string> {
  const existing = env("TOKEN_ADDRESS");
  if (existing) {
    console.log(`Token     (reuse): ${existing}`);
    return existing;
  }

  const art = await artifacts.readArtifact("Token");
  const ctor = (art.abi.find((x: any) => x.type === "constructor")?.inputs ?? []) as AbiInput[];

  const defaults: Record<string, any> = {
    name: env("TOKEN_NAME", "ProofToken"),
    symbol: env("TOKEN_SYMBOL", "PTK"),
    decimals: env("TOKEN_DECIMALS", "18"),
    initialSupply: () => ethers.toBigInt("0"),
    supply: () => ethers.toBigInt("0"),
  };

  const args = await buildArgs("TOKEN", ctor, defaults);
  console.log(`Deploying Token with ${args.length} arg(s):`, args);
  const Factory = await ethers.getContractFactory("Token");
  const token = await Factory.deploy(...args);
  const deployTx = token.deploymentTransaction();
  await waitForTx(deployTx, "Token deploy");
  const addr = await token.getAddress();
  console.log(`Token     deployed: ${addr}`);
  return addr;
}

async function deployNFT(): Promise<string> {
  const art = await artifacts.readArtifact("ProofNFT");
  const ctor = (art.abi.find((x: any) => x.type === "constructor")?.inputs ?? []) as AbiInput[];

  // ERC721 positional default: 2 or 3 string args
  const allStrings = ctor.every(i => i.type === "string");
  if (allStrings && (ctor.length === 2 || ctor.length === 3)) {
    const name    = env("PROOFNFT_NAME",    "ProofNFT")!;
    const symbol  = env("PROOFNFT_SYMBOL",  "PRF")!;
    const baseURI = env("PROOFNFT_BASEURI", "ipfs://placeholder/")!;

    const args = ctor.length === 3 ? [name, symbol, baseURI] : [name, symbol];
    console.log(`Deploying ProofNFT (ERC721 positional) with ${args.length} arg(s):`, args);

    const Factory = await ethers.getContractFactory("ProofNFT");
    const nft = await Factory.deploy(...args);
    const deployTx = nft.deploymentTransaction();
    await waitForTx(deployTx, "ProofNFT deploy");
    const addr = await nft.getAddress();
    console.log(`ProofNFT  deployed: ${addr}`);
    return addr;
  }

  // Fallback to name-based mapping
  const defaults: Record<string, any> = {
    name:    env("PROOFNFT_NAME",    "ProofNFT"),
    symbol:  env("PROOFNFT_SYMBOL",  "PRF"),
    baseURI: env("PROOFNFT_BASEURI", "ipfs://placeholder/"),
    _name:    env("PROOFNFT_NAME",    "ProofNFT"),
    _symbol:  env("PROOFNFT_SYMBOL",  "PRF"),
    _baseURI: env("PROOFNFT_BASEURI", "ipfs://placeholder/"),
    baseTokenURI:   env("PROOFNFT_BASEURI", "ipfs://placeholder/"),
    _baseTokenURI:  env("PROOFNFT_BASEURI", "ipfs://placeholder/"),
  };

  const args = await buildArgs("PROOFNFT", ctor, defaults);
  console.log(`Deploying ProofNFT (fallback) with ${args.length} arg(s):`, args);
  const Factory = await ethers.getContractFactory("ProofNFT");
  const nft = await Factory.deploy(...args);
  const deployTx = nft.deploymentTransaction();
  await waitForTx(deployTx, "ProofNFT deploy");
  const addr = await nft.getAddress();
  console.log(`ProofNFT  deployed: ${addr}`);
  return addr;
}

async function deployCrowdsale(tokenAddr: string, nftAddr: string): Promise<string> {
  const RATE =
    env("RATE_SCALED") !== undefined
      ? ethers.toBigInt(env("RATE_SCALED")!)
      : (ethers.toBigInt(env("RATE_TOKENS_PER_ETH", "1000")) * (10n ** 18n));

  const CAP_WEI =
    env("CAP_WEI") !== undefined
      ? ethers.toBigInt(env("CAP_WEI")!)
      : ethers.parseEther(env("CAP_ETH", "10"));

  const art = await artifacts.readArtifact("Crowdsale");
  const ctor = (art.abi.find((x: any) => x.type === "constructor")?.inputs ?? []) as AbiInput[];
  const ctorLen = ctor.length;

  let args: any[];
  if (ctorLen === 4) {
    args = [tokenAddr, RATE, CAP_WEI, nftAddr];
  } else if (ctorLen === 3) {
    args = [tokenAddr, RATE, CAP_WEI];
  } else {
    const defaults: Record<string, any> = {
      token: tokenAddr, _token: tokenAddr,
      rate: RATE.toString(), _rate: RATE.toString(),
      cap: CAP_WEI.toString(), _cap: CAP_WEI.toString(),
      nft: nftAddr, _nft: nftAddr,
    };
    args = await buildArgs("CROWDSALE", ctor, defaults);
    if (args.length !== ctorLen) {
      throw new Error(
        `Unsupported Crowdsale constructor (${ctorLen} params). ` +
        `Set envs like CROWDSALE_${ctor.map(i => i.name.toUpperCase()).join(", CROWDSALE_")} `
        + `or adjust the deploy script to your signature.`
      );
    }
  }

  console.log(`Deploying Crowdsale with ${args.length} arg(s):`, args);
  const Factory = await ethers.getContractFactory("Crowdsale");
  const sale = await Factory.deploy(...args);
  const deployTx = sale.deploymentTransaction();
  await waitForTx(deployTx, "Crowdsale deploy");
  const addr = await sale.getAddress();
  console.log(`Crowdsale deployed: ${addr}`);
  return addr;
}

async function tryGrantMinter(nftAddr: string, saleAddr: string) {
  try {
    const nft = await ethers.getContractAt("ProofNFT", nftAddr);
    if ((nft as any).MINTER_ROLE && (nft as any).grantRole) {
      const role = await (nft as any).MINTER_ROLE();
      const tx = await (nft as any).grantRole(role, saleAddr);
      await tx.wait();
      console.log(`Granted MINTER_ROLE to Crowdsale on ProofNFT`);
    } else if ((nft as any).grantMinter) {
      const tx = await (nft as any).grantMinter(saleAddr);
      await tx.wait();
      console.log(`Granted minter to Crowdsale on ProofNFT`);
    } else {
      console.log(`(Skipping NFT minter wiring — no grant function exposed)`);
    }
  } catch (e) {
    console.log(`(Non-fatal) Could not wire NFT minter role automatically: ${String(e)}`);
  }
}

async function main() {
  const net = network.name;
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${await deployer.getAddress()} on ${net}`);

  const tokenAddr = await deployToken();
  const nftAddr = await deployNFT();
  const saleAddr = await deployCrowdsale(tokenAddr, nftAddr);
  await tryGrantMinter(nftAddr, saleAddr);

  saveDeployment(net, { Token: tokenAddr, ProofNFT: nftAddr, Crowdsale: saleAddr });

  console.log(`
✅ Deploy complete:
- Token:     ${tokenAddr}
- ProofNFT:  ${nftAddr}
- Crowdsale: ${saleAddr}
- Rate:      ${
    env("RATE_SCALED")
      ? `${env("RATE_SCALED")} (scaled)`
      : `${env("RATE_TOKENS_PER_ETH", "1000")} tokens / 1 ETH (scaled to 1e18)`
  }
- Cap:       ${env("CAP_WEI") ? `${env("CAP_WEI")} wei` : `${env("CAP_ETH", "10")} ETH`}
`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
