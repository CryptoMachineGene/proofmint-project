// scripts/buy.js
const fs = require("fs");
const { ethers } = require("hardhat");
const { Wallet } = require("ethers");

function readMeta() {
  try {
    return JSON.parse(fs.readFileSync("deployments/latest.json", "utf8"));
  } catch (e) {
    return {};
  }
}

function isPk(k) {
  return /^0x[0-9a-fA-F]{64}$/.test(k || "");
}

async function main() {
  const meta = readMeta();

  const CROWDSALE_ADDR = process.env.CROWDSALE_ADDR || meta.crowdsale;
  const TOKEN_ADDR     = process.env.TOKEN_ADDR     || meta.token;
  const BUY_AMOUNT_ETH = process.env.BUY_AMOUNT_ETH || "0.001";

  if (!CROWDSALE_ADDR || !TOKEN_ADDR) {
    throw new Error("Missing contract addresses. Set CROWDSALE_ADDR/TOKEN_ADDR or have deployments/latest.json.");
  }

  // Choose buyer signer
  let buyer;
  if (isPk(process.env.BUYER_PRIVATE_KEY)) {
    buyer = new Wallet(process.env.BUYER_PRIVATE_KEY, ethers.provider);
  } else {
    [buyer] = await ethers.getSigners(); // fallback to first signer (deployer)
  }

  console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`Buyer:   ${buyer.address}`);
  console.log(`Crowdsale: ${CROWDSALE_ADDR}`);
  console.log(`Token:     ${TOKEN_ADDR}\n`);

  const sale  = await ethers.getContractAt("contracts/Crowdsale.sol:Crowdsale", CROWDSALE_ADDR, buyer);
  const token = await ethers.getContractAt("contracts/Token.sol:Token",        TOKEN_ADDR,     buyer);

  const rate  = await sale.rate(); // tokens per 1 ETH (18 decimals)
  const amt   = ethers.parseEther(BUY_AMOUNT_ETH);
  const expected = (amt * rate) / ethers.parseEther("1");

  const before = await token.balanceOf(buyer.address);
  console.log(`Buying ${BUY_AMOUNT_ETH} ETH worth of tokens... (expected: ${expected.toString()})`);

  const tx = await sale.buyTokens({ value: amt });
  console.log("buyTokens tx:", tx.hash);
  await tx.wait(2);

  const after = await token.balanceOf(buyer.address);

  console.log("\nBalances:");
  console.log("  before:", before.toString());
  console.log("  after: ", after.toString());
  console.log("  delta: ", (after - before).toString());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
