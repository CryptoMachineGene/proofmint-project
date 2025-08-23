import { ethers } from "hardhat";

// Env helpers
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env`);
  return v;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);

  // ----- Load env -----
  const existingToken = process.env.TOKEN_ADDRESS;

  const rateTokensPerEth = BigInt(requireEnv("RATE_TOKENS_PER_ETH"));
  const rate = rateTokensPerEth * 10n ** 18n;

  const cap = ethers.parseEther(requireEnv("CAP_ETH"));

  // ----- Deploy (or reuse) token -----
  let tokenAddress: string;
  if (existingToken) {
    tokenAddress = existingToken;
    console.log("Using existing token at:", tokenAddress);
  } else {
    console.log("Deploying MockMintableToken...");
    const Token = await ethers.getContractFactory(
      "contracts/test/MockMintableToken.sol:MockMintableToken"
    );
    const token = await Token.deploy();
    console.log("  Tx hash:", token.deploymentTransaction()?.hash);
    await token.waitForDeployment();
    tokenAddress = await token.getAddress();
    console.log("Deployed MockMintableToken at:", tokenAddress);
  }

  // ----- Deploy crowdsale -----
  console.log("Deploying Crowdsale...");
  const Sale = await ethers.getContractFactory("Crowdsale");
  const sale = await Sale.deploy(tokenAddress, rate, cap);
  console.log("  Tx hash:", sale.deploymentTransaction()?.hash);
  await sale.waitForDeployment();
  const saleAddress = await sale.getAddress();
  console.log("Deployed Crowdsale at:", saleAddress);

  // ----- Summary -----
  console.log("\n=== Deployment Complete ===");
  console.log("Crowdsale:", saleAddress);
  console.log("Token    :", tokenAddress);
  console.log("Rate     :", rate.toString(), "(on-chain, tokens per 1 ETH scaled by 1e18)");
  console.log("Cap (wei):", cap.toString());

  console.log(
    "\nTip: add to .env\n" +
      `CROWDSALE=${saleAddress}\n` +
      (existingToken ? "" : `TOKEN_ADDRESS=${tokenAddress}\n`)
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
