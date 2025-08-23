import { task } from "hardhat/config";
import { readAddresses } from "../scripts/utils/addresses";

task("proofnft:grant-minter", "Grant MINTER_ROLE on ProofNFT to an address")
  .addParam("nft", "Address of the ProofNFT contract")
  .addParam("to", "Address to grant MINTER_ROLE to")
  .setAction(async ({ nft, to }, hre) => {
    const { ethers } = hre;
    const contract = await ethers.getContractAt("ProofNFT", nft);
    const role = await contract.MINTER_ROLE();
    const tx = await contract.grantRole(role, to);
    await tx.wait();
    console.log(`✅ Granted MINTER_ROLE to ${to}`);
  });

task("proofnft:revoke-minter", "Revoke MINTER_ROLE from an address")
  .addParam("nft", "Address of the ProofNFT contract")
  .addParam("from", "Address to revoke MINTER_ROLE from")
  .setAction(async ({ nft, from }, hre) => {
    const { ethers } = hre;
    const contract = await ethers.getContractAt("ProofNFT", nft);
    const role = await contract.MINTER_ROLE();
    const tx = await contract.revokeRole(role, from);
    await tx.wait();
    console.log(`✅ Revoked MINTER_ROLE from ${from}`);
  });

task("proofnft:set-baseuri", "Set the baseURI for metadata")
  .addParam("nft", "Address of the ProofNFT contract")
  .addParam("uri", "New base URI")
  .setAction(async ({ nft, uri }, hre) => {
    const { ethers } = hre;
    const contract = await ethers.getContractAt("ProofNFT", nft);
    const tx = await contract.setBaseURI(uri);
    await tx.wait();
    console.log(`✅ Base URI updated to: ${uri}`);
  });

task("proofnft:totalsupply")
  .addOptionalParam("nft", "ProofNFT address (defaults to deployments file)")
  .setAction(async ({ nft }, hre) => {
    if (!nft) {
      const addrs = await readAddresses(hre.network.name);
      nft = addrs.ProofNFT;
      if (!nft) throw new Error("No ProofNFT in deployments; pass --nft");
    }
    const c = await hre.ethers.getContractAt("ProofNFT", nft);
    try {
      const total = await (c as any).totalSupply();
      console.log(`ℹ️ Total minted receipts (on-chain): ${total.toString()}`);
    } catch {
      // fallback to logs (works for older NFT)
      const topic0 = hre.ethers.id("ReceiptMinted(address,uint256)");
      const logs = await hre.ethers.provider.getLogs({ address: nft, topics: [topic0], fromBlock: 0, toBlock: "latest" });
      console.log(`ℹ️ Total minted receipts (by logs): ${logs.length}`);
    }
  });
