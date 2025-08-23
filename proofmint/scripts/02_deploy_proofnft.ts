import { ethers } from "hardhat";

async function main() {
  const NAME = "Proofmint Receipt";
  const SYMBOL = "PMR";
  const BASE_URI = ""; // e.g. "ipfs://<collectionCID>/"

  const ProofNFT = await ethers.getContractFactory("ProofNFT");
  const nft = await ProofNFT.deploy(NAME, SYMBOL, BASE_URI);
  await nft.waitForDeployment();

  console.log("ProofNFT deployed to:", await nft.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
