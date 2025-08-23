import hre, { ethers, network, run } from "hardhat";
import { readAddresses, writeAddresses } from "../utils/addresses";

async function main() {
  const net = network.name;
  const addrs = await readAddresses(net);

  // 1) Resolve token address:
  //    Priority: env.TOKEN_ADDRESS -> deployments file -> throw
  const envToken = (process.env.TOKEN_ADDRESS || "").trim();
  const tokenAddress = envToken || addrs.Token;
  if (!tokenAddress) {
    throw new Error(
      "Token address missing. Set TOKEN_ADDRESS in .env or write it to deployments/<network>.json as 'Token'."
    );
  }

  // 2) If you already have a crowdsale deployed (CROWDSALE_ADDRESS), persist + exit early
  const envCrowdsale = (process.env.CROWDSALE_ADDRESS || "").trim();
  if (envCrowdsale) {
    console.log("ℹ️ Using existing Crowdsale from .env:", envCrowdsale);
    addrs.Crowdsale = envCrowdsale;
    await writeAddresses(net, addrs);
    return;
  }

  // 3) Otherwise deploy a new crowdsale
  const rateEnv = process.env.RATE || "1000";
  const rate = BigInt(rateEnv);
  if (rate <= 0n) throw new Error("RATE must be a positive integer.");

  const Crowdsale = await ethers.getContractFactory("Crowdsale");
  const crowdsale = await Crowdsale.deploy(tokenAddress, rate);
  await crowdsale.waitForDeployment();
  const crowdsaleAddress = await crowdsale.getAddress();
  console.log("✅ Crowdsale deployed:", crowdsaleAddress);

  addrs.Token = tokenAddress;      // ensure saved
  addrs.Crowdsale = crowdsaleAddress;
  await writeAddresses(net, addrs);

  // 4) Optional: grant NFT minter role to Crowdsale (if your NFT is role-gated)
  if (addrs.ProofNFT) {
    try {
      await hre.run("grant-minter", {
        nft: addrs.ProofNFT,
        to: crowdsaleAddress,
      } as any);
      console.log("🔐 Granted minter role to Crowdsale on ProofNFT");
    } catch (e) {
      console.log("ℹ️ grant-minter skipped or failed:", (e as Error).message);
    }
  }

  // 5) Verify
  if (process.env.ETHERSCAN_API_KEY) {
    try {
      await run("verify:verify", {
        address: crowdsaleAddress,
        constructorArguments: [tokenAddress, rate],
      });
      console.log("🔎 Verified Crowdsale");
    } catch (e) {
      console.log("ℹ️ Verify (crowdsale) skipped or failed:", (e as Error).message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
