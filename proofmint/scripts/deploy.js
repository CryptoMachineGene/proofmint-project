// scripts/deploy.js
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // --- Read env (with sensible defaults) ---
  const rateStr = process.env.RATE_TOKENS_PER_ETH || "1000"; // tokens per 1 ETH
  const capEthStr = process.env.CAP_ETH || "10";             // total ETH to raise

  // Basic validation
  if (isNaN(Number(rateStr)) || Number(rateStr) <= 0) {
    throw new Error(`RATE_TOKENS_PER_ETH must be a positive number, got: ${rateStr}`);
  }
  if (isNaN(Number(capEthStr)) || Number(capEthStr) <= 0) {
    throw new Error(`CAP_ETH must be a positive number, got: ${capEthStr}`);
  }

  const RATE = BigInt(ethers.parseUnits(rateStr, 18)); // v6: returns bigint
  const CAP = ethers.parseEther(capEthStr);

  // --- Network & deployer info ---
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  const chainId = Number(net.chainId);
  const name = net.name || "unknown";
  const balWei = await ethers.provider.getBalance(deployer.address);

  console.log(`\nNetwork: ${name} (chainId: ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(balWei)} ETH\n`);

  if (chainId !== 31337 && balWei < ethers.parseEther("0.02")) {
    console.warn("⚠️  Low balance for a live network; deploy may fail.");
  }

  // How many confirmations to wait on non-local networks
  const confirmations = chainId === 31337 ? 0 : 2;

  // --- 1) Deploy Token ---
  const Token = await ethers.getContractFactory("contracts/Token.sol:Token");
  const token = await Token.deploy("Sakura", "SKR");
  console.log("Token tx:", token.deploymentTransaction().hash);
  await token.deploymentTransaction().wait(confirmations);
  const tokenAddr = await token.getAddress();
  console.log("Token deployed:", tokenAddr);

  // --- 2) Deploy Crowdsale(token, rate, cap) ---
  const Crowdsale = await ethers.getContractFactory("contracts/Crowdsale.sol:Crowdsale");
  const sale = await Crowdsale.deploy(tokenAddr, RATE, CAP);
  console.log("Crowdsale tx:", sale.deploymentTransaction().hash);
  await sale.deploymentTransaction().wait(confirmations);
  const saleAddr = await sale.getAddress();
  console.log("Crowdsale deployed:", saleAddr);

  // --- 3) Wire minter ---
  const setMinterTx = await token.setMinter(saleAddr);
  console.log("setMinter tx:", setMinterTx.hash);
  await setMinterTx.wait(confirmations);
  console.log("Token minter set to crowdsale");

  // --- 4) Persist addresses (for verify/frontends) ---
  const out = {
    network: { name, chainId },
    deployer: deployer.address,
    token: tokenAddr,
    crowdsale: saleAddr,
    rateTokensPerEth: RATE.toString(),
    capWei: CAP.toString(),
    timestamp: new Date().toISOString(),
  };
  fs.mkdirSync("deployments", { recursive: true });
  fs.writeFileSync("deployments/latest.json", JSON.stringify(out, null, 2));
  console.log("\nSaved deployments/latest.json");

  // --- 5) Print handy next steps ---
  if (chainId !== 31337) {
    const base = chainId === 11155111 ? "https://sepolia.etherscan.io" : "https://etherscan.io";
    console.log(`\nView on Etherscan:\n  ${base}/address/${tokenAddr}\n  ${base}/address/${saleAddr}`);
    console.log(
      `\nVerify Crowdsale (once indexed):\n  npx hardhat verify --network ${name} ${saleAddr} ${tokenAddr} ${RATE.toString()} ${CAP.toString()}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
