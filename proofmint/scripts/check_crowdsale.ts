import { ethers } from "hardhat";

function fmtWei(x: bigint | number | string) {
  try {
    const bi = typeof x === "bigint" ? x : BigInt(x as any);
    return `${ethers.formatEther(bi)} ETH (${bi} wei)`;
  } catch {
    return String(x);
  }
}

async function main() {
  const addr = process.env.CHECK_ADDR;
  if (!addr) throw new Error("Set CHECK_ADDR to the crowdsale address");

  const cs = await ethers.getContractAt("Crowdsale", addr);

  // Core fields (safe reads)
  const owner  = await (cs as any).owner?.().catch(() => "n/a");
  const rateBN = await (cs as any).rate?.().catch(() => 0n);
  const capBN  = await (cs as any).cap?.().catch(() => 0n);
  const wrBN   = await (cs as any).weiRaised?.().catch(() => 0n);

  // ABI presence checks
  const iface = (cs as any).interface;
  const hasBuyTokens = !!(iface && iface.getFunction?.("buyTokens"));
  const hasWithdraw  = !!(iface && iface.getFunction?.("withdraw"));

  // Probe whether plain ETH is accepted (simulate sending 1 wei)
  let acceptsPlainETH = false;
  try {
    await ethers.provider.call({ to: addr, value: 1n }); // eth_call with value
    acceptsPlainETH = true;
  } catch {
    acceptsPlainETH = false;
  }

  console.log(`Crowdsale @ ${addr}`);
  console.log({
    owner,
    rate: rateBN?.toString?.() ?? String(rateBN),
    capWei: capBN?.toString?.() ?? String(capBN),
    capPretty: fmtWei(capBN ?? 0n),
    weiRaised: wrBN?.toString?.() ?? String(wrBN),
    weiRaisedPretty: fmtWei(wrBN ?? 0n),
    hasBuyTokens,
    hasWithdraw,
    acceptsPlainETH,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
