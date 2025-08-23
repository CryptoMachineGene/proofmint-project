// tasks/balance.ts
import { task } from "hardhat/config";

task("balance", "Check token balance of an account")
  .addParam("token", "Token contract address")
  .addOptionalParam("account", "Account address (defaults to first signer)")
  .setAction(async ({ token, account }, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const target = account || signer.address;

    const erc20 = await hre.ethers.getContractAt("MockMintableToken", token);
    const bal = await erc20.balanceOf(target);

    console.log("Token:", token);
    console.log("Account:", target);
    console.log("Balance:", hre.ethers.formatEther(bal), "tokens");
  });
