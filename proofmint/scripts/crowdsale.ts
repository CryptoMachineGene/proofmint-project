import { ethers } from "hardhat";

async function main() {
  const addr = process.env.CHECK_ADDR;
  if (!addr) throw new Error("Set CHECK_ADDR to the crowdsale address");

  // Attach to your deployed Crowdsale by ABI/name in artifacts
  const cs = await ethers.getContractAt("Crowdsale", addr);

  // Core reads (safe-caught)
  const owner   = await (cs as any).owner().catch(() => "n/a");
  const rate    = (await (cs as any).rate().catch(() => 0n)).toString();
  const cap     = (await (cs as any).cap().catch(() => 0n)).toString();
  const raised  = (await (cs as any).weiRaised().catch(() => 0n)).toString();

  // ABI introspection for presence of functions
  const iface = (cs as any).interface;
  const hasBuyTokens = !!iface.getFunction("buyTokens");
  const hasWithdraw  = !!iface.getFunction("withdraw");

  console.log("Crowdsale @", addr);
  console.log({ owner, rate, cap, weiRaised: raised, hasBuyTokens, hasWithdraw });
}

main().catch((e) => { console.error(e); process.exit(1); });
