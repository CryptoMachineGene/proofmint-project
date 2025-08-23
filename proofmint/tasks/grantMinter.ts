import { task } from "hardhat/config";

task("grant-minter", "Grant MINTER_ROLE to an address")
  .addParam("nft", "ProofNFT contract address")
  .addParam("to", "Grantee address (e.g., crowdsale)")
  .setAction(async ({ nft, to }, { ethers }) => {
    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt("ProofNFT", nft, signer);
    const tx = await contract.grantMinter(to);
    console.log("Granting MINTER_ROLE... tx:", tx.hash);
    await tx.wait();
    console.log("Granted to:", to);
  });
