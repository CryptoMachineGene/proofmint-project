// scripts/check_crowdsale_extras.ts
import { ethers } from "hardhat";

async function main() {
  const addr = process.env.CHECK_ADDR!;
  const cs = await ethers.getContractAt("Crowdsale", addr);
  const token = await (cs as any).token();
  const nft   = await (cs as any).receiptNFT();
  console.log({ token, nft });
}
main().catch(e => { console.error(e); process.exit(1); });
