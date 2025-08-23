// scripts/withdraw.js
const fs = require("fs");
const { ethers } = require("hardhat");

function readMeta() {
  try { return JSON.parse(fs.readFileSync("deployments/latest.json","utf8")); }
  catch { return {}; }
}

async function main() {
  const meta = readMeta();
  const CROWDSALE_ADDR = process.env.CROWDSALE_ADDR || meta.crowdsale;
  if (!CROWDSALE_ADDR) throw new Error("Missing crowdsale address. Set CROWDSALE_ADDR or run deploy first.");

  const [owner] = await ethers.getSigners(); // assumes the first signer is the deployer/owner
  const sale = await ethers.getContractAt("contracts/Crowdsale.sol:Crowdsale", CROWDSALE_ADDR, owner);

  const beforeOwner = await ethers.provider.getBalance(owner.address);
  const beforeSale  = await ethers.provider.getBalance(CROWDSALE_ADDR);

  console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`Owner:   ${owner.address}`);
  console.log(`Crowdsale: ${CROWDSALE_ADDR}`);
  console.log(`Sale balance (ETH) before: ${ethers.formatEther(beforeSale)}\n`);

  if (beforeSale === 0n) {
    console.log("No funds in crowdsale. Nothing to withdraw.");
    return;
  }

  const tx = await sale.withdraw();
  console.log("withdraw tx:", tx.hash);
  await tx.wait(2);

  const afterOwner = await ethers.provider.getBalance(owner.address);
  const afterSale  = await ethers.provider.getBalance(CROWDSALE_ADDR);

  console.log("\nAfter withdraw:");
  console.log(`  Sale balance (ETH):   ${ethers.formatEther(afterSale)}`);
  console.log(`  Owner balance (ETH):  ${ethers.formatEther(afterOwner)}`);
  console.log(`  Transferred (ETH):    ${ethers.formatEther(beforeSale - afterSale)}`);
}

main().catch(e => { console.error(e); process.exitCode = 1; });
