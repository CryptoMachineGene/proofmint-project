import { expect } from "chai";
import { ethers } from "hardhat";

async function deployMintableForTests() {
  // Fully qualified to avoid HH701 if you have two mocks around
  const Mock = await ethers.getContractFactory(
    "contracts/mocks/MockMintableToken.sol:MockMintableToken"
  );
  return await Mock.deploy();
}

describe("Crowdsale amount math", function () {
  let ProofNFT: any, Crowdsale: any;
  let token: any, nft: any, sale: any;
  let buyer: any;

  const rate = ethers.parseUnits("1000", 18); // 1000 tokens per 1 ETH
  const cap  = ethers.parseEther("100");      // 100 ETH cap

  beforeEach(async function () {
    const [, buyerSigner] = await ethers.getSigners();
    buyer = buyerSigner;

    ProofNFT  = await ethers.getContractFactory("ProofNFT");
    Crowdsale = await ethers.getContractFactory("Crowdsale");

    // ✅ use the mock ERC-20 (no minter roles)
    token = await deployMintableForTests();

    // ✅ normal 3-arg NFT deploy
    nft   = await ProofNFT.deploy("Proof of Purchase", "RECEIPT", "ipfs://base/");

    // ✅ 4-arg Crowdsale deploy
    sale  = await Crowdsale.deploy(token.target, rate, cap, nft.target);

    // ✅ ONLY need to allow NFT receipts; ERC-20 mock needs no grants
    await nft.grantMinter(sale.target);
  });

  it("credits buyer with msg.value * rate / 1e18 tokens", async function () {
    const value = ethers.parseEther("0.1");
    await sale.connect(buyer).buyTokens({ value });

    const expected = (value * rate) / ethers.parseEther("1");
    const bal = await token.balanceOf(buyer.address);
    expect(bal).to.equal(expected);
  });
});
