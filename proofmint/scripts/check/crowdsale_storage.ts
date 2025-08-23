// scripts/check/crowdsale_storage.ts
import { ethers } from "hardhat";

function toAddr(slotVal: string) {
  // slotVal is 32-byte hex; address is the low 20 bytes
  return ethers.getAddress("0x" + slotVal.slice(26));
}

async function main() {
  const addr = process.env.CHECK_ADDR!;
  const p = ethers.provider;

  // Assuming current layout in your posted Crowdsale:
  // slot0: token
  // slot1: receiptNFT
  // slot2: owner
  // slot3: rate (uint256)
  // slot4: cap  (uint256)
  // slot5: weiRaised (uint256)

  const s0 = await p.getStorage(addr, 0); // token
  const s1 = await p.getStorage(addr, 1); // receiptNFT
  const s2 = await p.getStorage(addr, 2); // owner
  const s3 = await p.getStorage(addr, 3); // rate
  const s4 = await p.getStorage(addr, 4); // cap

  const token      = toAddr(s0);
  const receiptNFT = toAddr(s1);
  const owner      = toAddr(s2);
  const rate       = BigInt(s3).toString();
  const cap        = BigInt(s4).toString();

  console.log({ token, receiptNFT, owner, rate, cap });
}

main().catch((e) => { console.error(e); process.exit(1); });
