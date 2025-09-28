// scripts/deploy.ts
import { ethers, network } from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { appendTx } from "./_txlog";

// ---------- Config (adjust as needed) ----------
const RATE_TOKENS_PER_ETH = 1000n;                 // 1000 tokens per 1 ETH
const CAP_ETH = 10n;                                // 10 ETH cap
const NFT_NAME = "Proofmint Proof";
const NFT_SYMBOL = "PRF";
const NFT_BASE_URI = "https://your-base-uri/{id}"; // <-- replace for production
// ----------------------------------------------

type DeployMap = Record<string, string>;

function deploymentsPath(net: string) {
  return path.join(__dirname, "..", "deployments", `${net}.json`);
}

function loadDeployments(net: string): DeployMap {
  const file = deploymentsPath(net);
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8")) as DeployMap;
}

function saveDeployments(net: string, map: DeployMap) {
  const file = deploymentsPath(net);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(map, null, 2));
  console.log(`\n📝 Saved deployments -> ${file}\n`);
}

function toWeiEth(amountEth: bigint) {
  return amountEth * 10n ** 18n; // 1e18
}

async function main() {
  const net = network.name; // e.g., "sepolia", "localhost", "anvil"
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();

  console.log(`Deployer: ${deployerAddr} on ${net}`);

  const existing = loadDeployments(net);
  const out: DeployMap = { ...existing };

  // 1) Token (reuse if present)
  let tokenAddr = existing.Token;
  if (tokenAddr) {
    console.log(`Token     (reuse): ${tokenAddr}`);
  } else {
    console.log(`Deploying Token (ERC20) ...`);
    const token = await ethers.deployContract("Token", [], { signer: deployer });
    await token.waitForDeployment();
    tokenAddr = await token.getAddress();
    console.log(`  Token deploy tx: ${token.deploymentTransaction()?.hash}`);
    console.log(`  Token     deployed: ${tokenAddr}`);

    // Log deploy tx
    const tokenTx = token.deploymentTransaction()?.hash;
    if (tokenTx) appendTx("deploy", tokenTx, { contract: "Token", network: net });

    out.Token = tokenAddr;
  }

  // 2) ProofNFT (always (re)deploy or reuse if desired)
  let nftAddr = existing.ProofNFT;
  if (nftAddr) {
    console.log(`ProofNFT  (reuse): ${nftAddr}`);
  } else {
    console.log(`Deploying ProofNFT (ERC721 positional) with 3 arg(s): [ '${NFT_NAME}', '${NFT_SYMBOL}', '${NFT_BASE_URI}' ]`);
    const proofNft = await ethers.deployContract("ProofNFT", [NFT_NAME, NFT_SYMBOL, NFT_BASE_URI], { signer: deployer });
    await proofNft.waitForDeployment();
    nftAddr = await proofNft.getAddress();

    console.log(`  ProofNFT deploy tx: ${proofNft.deploymentTransaction()?.hash}`);
    console.log(`  ProofNFT  deployed: ${nftAddr}`);

    const nftTx = proofNft.deploymentTransaction()?.hash;
    if (nftTx) appendTx("deploy", nftTx, { contract: "ProofNFT", network: net });

    out.ProofNFT = nftAddr;
  }

  // 3) Crowdsale
  //    Constructor expected: (tokenAddr, rateScaled, capWei, nftAddr)
  //    Where rateScaled is scaled to 1e18 (tokens per 1 ETH * 1e18).
  const rateScaled = RATE_TOKENS_PER_ETH * 10n ** 18n;
  const capWei = toWeiEth(CAP_ETH);

  console.log(
    `Deploying Crowdsale with 4 arg(s): [\n  '${tokenAddr}',\n  ${rateScaled}n,\n  ${capWei}n,\n  '${nftAddr}'\n]`
  );

  const crowdsale = await ethers.deployContract("Crowdsale", [tokenAddr, rateScaled, capWei, nftAddr], { signer: deployer });
  await crowdsale.waitForDeployment();
  const crowdsaleAddr = await crowdsale.getAddress();

  console.log(`  Crowdsale deploy tx: ${crowdsale.deploymentTransaction()?.hash}`);
  console.log(`  Crowdsale deployed: ${crowdsaleAddr}`);

  const saleTx = crowdsale.deploymentTransaction()?.hash;
  if (saleTx) appendTx("deploy", saleTx, { contract: "Crowdsale", network: net });

  out.Crowdsale = crowdsaleAddr;

  // 4) Grant MINTER_ROLE on ProofNFT to Crowdsale (if NFT supports AccessControl)
  //    MINTER_ROLE = keccak256("MINTER_ROLE")
  const MINTER_ROLE = ethers.id("MINTER_ROLE");
  try {
    const nft = await ethers.getContractAt("ProofNFT", nftAddr!, deployer);
    const hasRole: boolean = await nft.hasRole(MINTER_ROLE, crowdsaleAddr);
    if (!hasRole) {
      const grantTx = await nft.grantRole(MINTER_ROLE, crowdsaleAddr);
      console.log(`Granting MINTER_ROLE to Crowdsale on ProofNFT (tx: ${grantTx.hash})`);
      await grantTx.wait();
      console.log(`Granted MINTER_ROLE to Crowdsale on ProofNFT`);
      appendTx("misc", grantTx.hash, { contract: "ProofNFT", action: "grantRole(MINTER_ROLE)", to: crowdsaleAddr, network: net });
    } else {
      console.log(`MINTER_ROLE already granted to ${crowdsaleAddr}`);
    }
  } catch (e) {
    console.warn(`(Optional) Could not grant MINTER_ROLE on ProofNFT — does your NFT use AccessControl?`, e);
  }

  // 5) Persist deployments
  saveDeployments(net, out);

  // 6) Pretty summary
  console.log(
    `
    Deploy complete:
    - Token:     ${out.Token}
    - ProofNFT:  ${out.ProofNFT}
    - Crowdsale: ${out.Crowdsale}
    - Rate:      ${RATE_TOKENS_PER_ETH} tokens / 1 ETH (scaled to 1e18)
    - Cap:       ${CAP_ETH} ETH
    `
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
