// scripts/deploy_crowdsale.ts
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  // .env MUST have these:
  const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;        // existing ERC20
  const BENEFICIARY_WALLET = process.env.BENEFICIARY_WALLET; // where ETH goes
  const RATE = process.env.CROWDSALE_RATE ?? "1000";      // tokens per 1 ETH (example)

  if (!TOKEN_ADDRESS || !BENEFICIARY_WALLET) {
    throw new Error("Set TOKEN_ADDRESS and BENEFICIARY_WALLET in your .env");
  }

  // IMPORTANT: use the exact contract name from your artifacts (likely "Crowdsale")
  const Crowdsale = await ethers.getContractFactory("Crowdsale");
  const sale = await Crowdsale.deploy(
    BigInt(RATE),           // adjust order if your constructor differs
    BENEFICIARY_WALLET,
    TOKEN_ADDRESS
  );
  await sale.waitForDeployment();

  console.log("Crowdsale deployed to:", await sale.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
