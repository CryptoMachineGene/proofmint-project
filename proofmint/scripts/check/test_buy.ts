// scripts/check/tiny_buy.ts
import { ethers } from "hardhat";
async function main() {
  const crowdsaleAddr = process.env.CROWDSALE_ADDRESS || process.env.CROWDSALE!;
  const tokenAddr = process.env.TOKEN_ADDRESS!;
  const [signer] = await ethers.getSigners();
  const buyer = await signer.getAddress();

  const crowdsale = await ethers.getContractAt("Crowdsale", crowdsaleAddr, signer);
  const erc20 = await ethers.getContractAt("IERC20", tokenAddr, signer);

  const before = await erc20.balanceOf(buyer);
  const val = ethers.parseEther("0.001");
  console.log("Buying with", val.toString(), "wei…");
  const tx = await crowdsale.buyTokens({ value: val }); await tx.wait();
  const after = await erc20.balanceOf(buyer);
  console.log("Delta:", (after - before).toString());
}
main().catch((e)=>{console.error(e);process.exit(1);});
