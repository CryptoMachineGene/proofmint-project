// scripts/withdraw.ts
import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";
import { appendTx } from "./_txlog";

type DeployMap = Record<string, string>;

function loadAddress(name: string, net: string): string {
  const file = path.join(__dirname, "..", "deployments", `${net}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Deployments file not found: ${file}`);
  }
  const json = JSON.parse(fs.readFileSync(file, "utf8")) as DeployMap;
  const addr = process.env.CROWDSALE_ADDR || json[name];
  if (!addr) throw new Error(`Missing ${name} address in ${file} (or CROWDSALE_ADDR env var)`);
  if (!ethers.isAddress(addr)) {
    throw new Error(`Invalid ${name} address: "${addr}". Use a full 0x… address or remove CROWDSALE_ADDR to use ${file}.`);
  }
  return ethers.getAddress(addr); // checksummed
}

async function main() {
  const net = network.name;
  const saleAddr = loadAddress("Crowdsale", net);

  const [caller] = await ethers.getSigners();
  const callerAddr = await caller.getAddress();
  console.log(`Network: ${net}`);
  console.log(`Caller:  ${callerAddr} (must be owner)`);
  console.log(`Sale:    ${saleAddr}\n`);

  const sale = await ethers.getContractAt("Crowdsale", saleAddr, caller);

  // Verify caller is owner
  const owner = await sale.owner();
  if (owner.toLowerCase() !== callerAddr.toLowerCase()) {
    throw new Error(`Caller ${callerAddr} is not owner ${owner}`);
  }

  // Pre-balance log
  const beforeBal = await ethers.provider.getBalance(saleAddr);
  console.log(`Contract balance (before): ${ethers.formatEther(beforeBal)} ETH`);

  // Withdraw
  const tx = await sale.withdraw();
  console.log(`Tx sent: ${tx.hash}`);
  const rcpt = await tx.wait();
  console.log(`Mined in block ${rcpt?.blockNumber}`);

  // Post-balance log
  const afterBal = await ethers.provider.getBalance(saleAddr);
  console.log(`Contract balance (after):  ${ethers.formatEther(afterBal)} ETH`);

  // Log transaction automatically
  appendTx("withdraw", tx.hash);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
