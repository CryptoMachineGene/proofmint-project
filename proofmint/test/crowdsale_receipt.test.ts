import { expect } from "chai";
import { ethers } from "hardhat";

async function deployMintableForTests() {
  const Mock = await ethers.getContractFactory(
    "contracts/mocks/MockMintableToken.sol:MockMintableToken"
  );
  return await Mock.deploy();
}

describe("Crowdsale + ProofNFT (mintTo wrapper)", function () {
  let ProofNFT: any, Crowdsale: any;
  let token: any, nft: any, sale: any;
  let buyer: any;

  const rate = ethers.parseUnits("1000", 18);
  const cap  = ethers.parseEther("100");

  beforeEach(async function () {
    const [, buyerSigner] = await ethers.getSigners();
    buyer = buyerSigner;

    ProofNFT  = await ethers.getContractFactory("ProofNFT");
    Crowdsale = await ethers.getContractFactory("Crowdsale");

    // ✅ mock token (no roles)
    token = await deployMintableForTests();

    nft   = await ProofNFT.deploy("Proof of Purchase", "RECEIPT", "ipfs://base/");
    sale  = await Crowdsale.deploy(token.target, rate, cap, nft.target);

    // ✅ only NFT needs a grant
    await nft.grantMinter(sale.target);
  });

  it("mints an NFT receipt to the buyer on buyTokens()", async function () {
    await expect(sale.connect(buyer).buyTokens({ value: ethers.parseEther("0.05") }))
      .to.emit(nft, "ReceiptMinted")
      .withArgs(buyer.address, 1n);
  });
});
