// scripts/deploy/03_deploy_crowdsale_with_nft.ts
import hre, { ethers, network, run } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { readAddresses, writeAddresses } from "../utils/addresses";

function first<T>(...vals: (T | undefined | null | "" )[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v as T;
  return undefined;
}

function toWeiFromEthInt(ethStr: string): bigint {
  if (!/^\d+$/.test(ethStr)) {
    throw new Error(`CAP_ETH must be an integer (e.g., "10"). Use CROWDSALE_CAP (wei) for decimals.`);
  }
  return BigInt(ethStr) * 10n ** 18n;
}

function envClean(s?: string) {
  if (!s) return "";
  const i = s.indexOf("#");
  return (i >= 0 ? s.slice(0, i) : s).trim();
}

async function main() {
  console.log("▶️  Crowdsale+NFT deploy starting… network =", network.name);
  const net = network.name;
  const addrs = await readAddresses(net);

  // ---- tokenAddress ----
  const envToken = envClean(process.env.TOKEN_ADDRESS);
  const fileToken = (addrs as any).Token;
  const tokenAddress = first<string>(envToken, fileToken);
  if (!tokenAddress) throw new Error("❌ Missing TOKEN_ADDRESS in .env and no 'Token' in deployments file.");
  console.log(`ℹ️ Using TOKEN_ADDRESS: ${envToken ? "(.env) " : "(deployments) "} ${tokenAddress}`);

  // ---- rate ----
  const rateStr = first<string>(envClean(process.env.RATE), envClean(process.env.RATE_TOKENS_PER_ETH));
  if (!rateStr) throw new Error("❌ Missing RATE (or RATE_TOKENS_PER_ETH) in .env.");
  if (!/^\d+$/.test(rateStr)) throw new Error(`❌ RATE_TOKENS_PER_ETH must be an unsigned integer; got "${rateStr}"`);
  const rate = BigInt(rateStr);
  console.log("ℹ️ Using RATE (tokens per 1 ETH):", rate.toString());

  // ---- cap ----
  const capWeiStr = envClean(process.env.CROWDSALE_CAP);
  const capEthStr = envClean(process.env.CAP_ETH);
  let cap: bigint | undefined;
  if (capWeiStr) {
    if (!/^\d+$/.test(capWeiStr)) throw new Error(`❌ CROWDSALE_CAP must be a wei integer; got "${capWeiStr}"`);
    cap = BigInt(capWeiStr);
    console.log(`ℹ️ Using CROWDSALE_CAP (wei): ${capWeiStr}`);
  } else if (capEthStr) {
    cap = toWeiFromEthInt(capEthStr);
    console.log(`ℹ️ Using CAP_ETH (ETH int): ${capEthStr} → (wei): ${cap.toString()}`);
  }
  if (cap === undefined) throw new Error("❌ Missing CROWDSALE_CAP (wei) or CAP_ETH (ETH int).");

  // ---- NFT deploy (fresh ProofNFT) ----
  const nftName  = envClean(process.env.NFT_NAME)  || "Proof of Purchase";
  const nftSym   = envClean(process.env.NFT_SYMBOL) || "RECEIPT";
  const baseURI  = envClean(process.env.NFT_BASE_URI) || "ipfs://base/";

  console.log("🧱 Deploying ProofNFT with args:", { nftName, nftSym, baseURI });
  const ProofNFT = await ethers.getContractFactory("ProofNFT");
  const nft = await ProofNFT.deploy(nftName, nftSym, baseURI);
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("✅ ProofNFT deployed:", nftAddress);

  // ---- Crowdsale deploy (uses existing Token + new NFT) ----
  console.log("🚀 Deploying Crowdsale with args:", {
    tokenAddress,
    rate: rate.toString(),
    cap: cap.toString(),
    nftAddress,
  });
  const Crowdsale = await ethers.getContractFactory("Crowdsale");
  const crowdsale = await Crowdsale.deploy(tokenAddress, rate, cap, nftAddress);
  await crowdsale.waitForDeployment();
  const crowdsaleAddress = await crowdsale.getAddress();
  console.log("✅ Crowdsale deployed:", crowdsaleAddress);

  // ---- Persist addresses ----
  (addrs as any).Token     = tokenAddress;
  (addrs as any).ProofNFT  = nftAddress;
  (addrs as any).Crowdsale = crowdsaleAddress;
  await writeAddresses(net, addrs);

  // --- Mirror addresses into the frontend for auto-wire ---
  try {
    // scripts/deploy → ../../.. → proofmint-project/ → proofmint-frontend/src/addresses
    const frontAddrDir = path.resolve(__dirname, "../../../proofmint-frontend/src/addresses");
    fs.mkdirSync(frontAddrDir, { recursive: true });
    const frontFile = path.join(frontAddrDir, `${net}.json`);
    fs.writeFileSync(frontFile, JSON.stringify(addrs, null, 2));
    console.log(`🪄 Wrote frontend addresses → ${frontFile}`);
  } catch (e) {
    console.log("ℹ️ Frontend address mirror skipped/failed:", (e as Error).message);
  }

  // ===== Permissions =====
  // NFT: grant minter to Crowdsale
  try {
    const txNft = await (nft as any).grantMinter(crowdsaleAddress);
    await txNft.wait();
    console.log("🔐 Granted NFT minter to Crowdsale via grantMinter()");
  } catch (e) {
    console.log("ℹ️ NFT grantMinter failed/skipped:", (e as Error).message);
  }

  // TOKEN: grant minter to Crowdsale (helper first, then AccessControl)
  try {
    const token = await ethers.getContractAt("Token", tokenAddress);
    try {
      const tx1 = await (token as any).grantMinter(crowdsaleAddress);
      await tx1.wait();
      console.log("🔐 Granted TOKEN minter to Crowdsale via grantMinter()");
    } catch {
      const MINTER_ROLE = await (token as any).MINTER_ROLE();
      const tx2 = await (token as any).grantRole(MINTER_ROLE, crowdsaleAddress);
      await tx2.wait();
      console.log("🔐 Granted TOKEN minter to Crowdsale via grantRole(MINTER_ROLE)");
    }
  } catch (e) {
    console.log("ℹ️ TOKEN grant skipped/failed:", (e as Error).message);
  }

  // ---- Verify (optional) ----
  if (process.env.ETHERSCAN_API_KEY) {
    try {
      console.log("⏳ Waiting a few seconds before verify so Etherscan can index...");
      await new Promise((r) => setTimeout(r, 10000));
      await run("verify:verify", {
        address: crowdsaleAddress,
        constructorArguments: [tokenAddress, rate, cap, nftAddress],
      });
      console.log("🔎 Verified Crowdsale successfully on the block explorer");

      // Optional: verify NFT too
      try {
        await run("verify:verify", {
          address: nftAddress,
          constructorArguments: [nftName, nftSym, baseURI],
        });
        console.log("🔎 Verified ProofNFT successfully on the block explorer");
      } catch (e) {
        console.log("ℹ️ Verify (ProofNFT) skipped/failed:", (e as Error).message);
      }
    } catch (e) {
      console.log("ℹ️ Verify (crowdsale) skipped/failed:", (e as Error).message);
    }
  }
}

main().catch((e) => {
  console.error("🚨 Script failed:", e);
  process.exit(1);
});
