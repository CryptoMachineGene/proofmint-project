import { expect } from "chai";
import { ethers } from "hardhat";

async function deployMockToken() {
  const Mock = await ethers.getContractFactory(
    "contracts/mocks/MockMintableToken.sol:MockMintableToken"
  );
  return await Mock.deploy();
}

describe("Crowdsale + ProofNFT receipts", function () {
  let token: any, nft: any, sale: any;
  let buyer: any;

  const rate = ethers.parseUnits("1000", 18);
  const cap  = ethers.parseEther("100");

  beforeEach(async function () {
    const [, buyerSigner] = await ethers.getSigners();
    buyer = buyerSigner;

    const ProofNFT  = await ethers.getContractFactory("ProofNFT");
    const Crowdsale = await ethers.getContractFactory("Crowdsale");

    // ✅ mock token (auto-mint, no roles required)
    token = await deployMockToken();

    nft   = await ProofNFT.deploy("Proof of Purchase", "RECEIPT", "ipfs://base/");
    sale  = await Crowdsale.deploy(token.target, rate, cap, nft.target);

    // ✅ Crowdsale must be able to mint NFT
    await nft.grantMinter(sale.target);
  });

  it("mints an NFT for each purchase (per transaction)", async () => {
    const buy = ethers.parseEther("0.1");

    // First purchase
    await expect(sale.connect(buyer).buyTokens({ value: buy }))
      .to.emit(sale, "TokensPurchased")
      .and.to.emit(sale, "ReceiptMinted");

    // Second purchase → second NFT
    await expect(sale.connect(buyer).buyTokens({ value: buy }))
      .to.emit(sale, "TokensPurchased")
      .and.to.emit(sale, "ReceiptMinted");

    expect(await nft.balanceOf(buyer.address)).to.equal(2n);
  });
});
