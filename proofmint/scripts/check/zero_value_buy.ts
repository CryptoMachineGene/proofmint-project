import { ethers } from "hardhat";

async function main() {
  const addr = process.env.CROWDSALE_ADDRESS || process.env.CROWDSALE;
  if (!addr) throw new Error("Set CROWDSALE_ADDRESS (or CROWDSALE) in .env");

  const [signer] = await ethers.getSigners();
  const crowdsale = await ethers.getContractAt("Crowdsale", addr, signer);

  try {
    await crowdsale.buyTokens({ value: 0n });
    console.log("❌ Zero-value buy unexpectedly succeeded");
  } catch {
    console.log("✅ Zero-value buy correctly reverted");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
