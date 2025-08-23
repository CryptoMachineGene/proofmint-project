import { expect } from "chai";
import { ethers } from "hardhat";

async function deployTokenFlexible() {
  const Token = await ethers.getContractFactory("Token");
  try {
    // Try no-arg constructor
    return await Token.deploy();
  } catch {
    // Fallback to (name, symbol)
    return await Token.deploy("TestToken", "TTK");
  }
}

describe("Deployment (fresh)", function () {
  let ProofNFT: any, Crowdsale: any;
  let token: any, nft: any;

  const rate = ethers.parseUnits("1000", 18);
  const cap  = ethers.parseEther("100");

  beforeEach(async function () {
    ProofNFT  = await ethers.getContractFactory("ProofNFT");
    Crowdsale = await ethers.getContractFactory("Crowdsale");

    token = await deployTokenFlexible();
    nft   = await ProofNFT.deploy("Proof of Purchase", "RECEIPT", "ipfs://base/");
  });

  it("reverts when token address is zero", async function () {
    await expect(
      Crowdsale.deploy(ethers.ZeroAddress, rate, cap, nft.target)
    ).to.be.revertedWith("token addr=0");
  });

  it("reverts when rate is zero", async function () {
    await expect(
      Crowdsale.deploy(token.target, 0n, cap, nft.target)
    ).to.be.revertedWith("rate=0");
  });

  it("reverts when cap is zero", async function () {
    await expect(
      Crowdsale.deploy(token.target, rate, 0n, nft.target)
    ).to.be.revertedWith("cap=0");
  });

  it("stores constructor params correctly", async function () {
    const sale = await Crowdsale.deploy(token.target, rate, cap, nft.target);
    expect(await sale.token()).to.equal(token.target);
    expect(await sale.receiptNFT()).to.equal(nft.target);
    expect(await sale.rate()).to.equal(rate);
    expect(await sale.cap()).to.equal(cap);
  });
});
