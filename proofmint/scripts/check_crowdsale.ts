import { ethers } from "hardhat";

async function main() {
  const addr = process.env.CHECK_ADDR;
  if (!addr) throw new Error("Set CHECK_ADDR to the crowdsale address");

  const cs = await ethers.getContractAt("Crowdsale", addr);

  const owner = await (cs as any).owner();
  const rate  = (await (cs as any).rate()).toString();
  const cap   = (await (cs as any).cap()).toString();

  console.log({ owner, rate, cap });
}

main().catch((e) => { console.error(e); process.exit(1); });
