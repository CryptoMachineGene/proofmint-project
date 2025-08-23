import { expect } from "chai";
import { ethers } from "hardhat";
import type { ProofNFT } from "../typechain-types";

describe("ProofNFT", () => {
  let nft: ProofNFT;
  let admin: any, minter: any, user: any;

  beforeEach(async () => {
    [admin, minter, user] = await ethers.getSigners();
    const ProofNFT = await ethers.getContractFactory("ProofNFT", admin);
    nft = (await ProofNFT.deploy("Proofmint Receipt", "PMR", "")) as ProofNFT;
    await nft.waitForDeployment();
  });

  it("grants MINTER_ROLE and mints a receipt", async () => {
    const MINTER_ROLE = await nft.MINTER_ROLE();

    await (await nft.grantMinter(minter.address)).wait();
    expect(await nft.hasRole(MINTER_ROLE, minter.address)).to.eq(true);

    await expect(nft.connect(minter).mintReceipt(user.address, ""))
      .to.emit(nft, "ReceiptMinted");

    expect(await nft.ownerOf(1)).to.eq(user.address);
  });

  it("reverts when non-minter calls mintReceipt", async () => {
  const MINTER_ROLE = await nft.MINTER_ROLE();
  await expect(nft.connect(user).mintReceipt(user.address, ""))
    .to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount")
    .withArgs(user.address, MINTER_ROLE);
  });
});
