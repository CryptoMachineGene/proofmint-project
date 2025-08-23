import { ethers } from "hardhat";

async function main() {
  const crowdsaleAddr = process.env.CROWDSALE_ADDRESS || process.env.CROWDSALE;
  const tokenAddr = process.env.TOKEN_ADDRESS;
  if (!crowdsaleAddr || !tokenAddr) {
    throw new Error("Set CROWDSALE_ADDRESS (or CROWDSALE) and TOKEN_ADDRESS in .env");
  }

  const [signer] = await ethers.getSigners();
  const buyer = await signer.getAddress();

  const crowdsale = await ethers.getContractAt("Crowdsale", crowdsaleAddr, signer);
  const erc20 = await ethers.getContractAt("IERC20", tokenAddr, signer);

  const before = await erc20.balanceOf(buyer);
  const val = ethers.parseEther("0.001"); // 0.001 ETH
  console.log("Buying with", val.toString(), "wei…");

  const tx = await crowdsale.buyTokens({ value: val });
  console.log("tx:", tx.hash);
  await tx.wait();

  const after = await erc20.balanceOf(buyer);
  console.log("Token balance before:", before.toString());
  console.log("Token balance after :", after.toString());
  console.log("Delta:", (after - before).toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
