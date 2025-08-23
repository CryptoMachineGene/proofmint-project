// scripts/deploy/02_deploy_proofnft.ts
import { ethers, network, run } from "hardhat";
import { writeAddresses, readAddresses } from "../utils/addresses";

function envClean(s?: string) {
  if (!s) return "";
  const i = s.indexOf("#");
  return (i >= 0 ? s.slice(0, i) : s).trim();
}

async function main() {
  console.log("▶️ Deploying ProofNFT on", network.name);

  const name   = envClean(process.env.NFT_NAME)   || "ProofMint Receipt";
  const symbol = envClean(process.env.NFT_SYMBOL) || "PMR";
  const base   = envClean(process.env.NFT_BASE_URI) || "https://your-cdn/metadata/";

  const ProofNFT = await ethers.getContractFactory("ProofNFT");
  const nft = await ProofNFT.deploy(name, symbol, base);
  await nft.waitForDeployment();

  const nftAddress = await nft.getAddress();
  console.log("✅ ProofNFT deployed:", nftAddress);

  // Persist to addresses file
  const addrs = await readAddresses(network.name);
  addrs.ProofNFT = nftAddress;
  await writeAddresses(network.name, addrs);

  // Wait 5 confs to make verify reliable
  const deployTx = nft.deploymentTransaction();
  if (deployTx) {
    console.log("⛓️ waiting for 5 confirmations...");
    await deployTx.wait(5);
  }

  // Optional auto-verify
  if (process.env.ETHERSCAN_API_KEY) {
    try {
      await run("verify:verify", {
        address: nftAddress,
        constructorArguments: [name, symbol, base],
        contract: "contracts/ProofNFT.sol:ProofNFT",
      });
      console.log("🔎 Verified ProofNFT");
    } catch (e) {
      console.log("ℹ️ Verify (ProofNFT) skipped/failed:", (e as Error).message);
    }
  }
}

main().catch((e) => {
  console.error("🚨 script failed:", e);
  process.exit(1);
});
