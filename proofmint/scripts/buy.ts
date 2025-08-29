// scripts/buy.ts
import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

type DeployMap = Record<string, string>;

function loadAddress(name: string, net: string): string {
  const file = path.join(__dirname, "..", "deployments", `${net}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Deployments file not found: ${file}`);
  }
  const json = JSON.parse(fs.readFileSync(file, "utf8")) as DeployMap;
  const addr = process.env.SALE_ADDR || json[name];
  if (!addr) throw new Error(`Missing ${name} address in ${file} (or SALE_ADDR env var)`);
  return addr;
}

async function main() {
  const net = network.name; // e.g., "sepolia"
  const saleAddr = loadAddress("Crowdsale", net);

  // Amount in ETH via ENV or default
  const ethStr = process.env.ETH || "0.001";
  const value = ethers.parseEther(ethStr);

  const [signer] = await ethers.getSigners();
  console.log(`Network: ${net}`);
  console.log(`Buyer:   ${await signer.getAddress()}`);
  console.log(`Sale:    ${saleAddr}`);
  console.log(`Paying:  ${ethStr} ETH\n`);

  const sale = await ethers.getContractAt("Crowdsale", saleAddr, signer);

  // Optional pre-quote if your contract exposes it; else skip
  try {
    const tokensOut = await sale.quote(value);
    console.log(`Quote:   ${tokensOut.toString()} tokens`);
  } catch {
    console.log("Quote:   (no quote() available, proceeding to buy)");
  }

  const tx = await sale.buyTokens({ value });
  console.log(`Tx sent: ${tx.hash}`);
  const rcpt = await tx.wait();
  console.log(`Mined in block ${rcpt?.blockNumber}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
