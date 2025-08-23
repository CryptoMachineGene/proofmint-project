// tasks/accounts.ts
import { task } from "hardhat/config";

task("accounts", "Prints the list of accounts (and balances)")
  .setAction(async (_args, hre) => {
    const accounts = await hre.ethers.getSigners();
    if (accounts.length === 0) {
      console.log("No accounts configured for this network.");
      return;
    }
    for (const a of accounts) {
      const balWei = await hre.ethers.provider.getBalance(a.address);
      console.log(`${a.address} — ${ethers.formatEther(balWei)} ETH`);
    }
  });
