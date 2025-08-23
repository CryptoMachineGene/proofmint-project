import { ethers } from "hardhat";

function first<T>(...vals: (T | undefined | null | "")[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v as T;
}

async function callFirst<T = any>(c: any, fns: string[], ...args: any[]): Promise<T | undefined> {
  for (const fn of fns) {
    try {
      if (typeof (c as any)[fn] === "function") {
        const res = await (c as any)[fn](...args);
        if (res !== undefined) return res as T;
      }
    } catch {
      /* try next */
    }
  }
  return undefined;
}

function fmtEth(n: bigint) {
  const ONE = 10n ** 18n;
  const whole = n / ONE;
  const frac = n % ONE;
  // show up to 6 decimals without trailing zeros
  const fracStr = (frac * 10n ** 6n / ONE).toString().replace(/0+$/, "");
  return fracStr.length ? `${whole}.${fracStr}` : `${whole}`;
}

async function main() {
  const crowdsaleAddr = first<string>(
    (process.env.CROWDSALE_ADDRESS || "").trim(),
    (process.env.CROWDSALE || "").trim()
  );
  if (!crowdsaleAddr) throw new Error("Set CROWDSALE_ADDRESS (or CROWDSALE) in .env");

  const [signer] = await ethers.getSigners();
  const cs = await ethers.getContractAt("Crowdsale", crowdsaleAddr, signer);

  // Read cap and raised using likely getters
  const cap = await callFirst<bigint>(cs, ["cap", "_cap"]);
  if (!cap) throw new Error("Could not read cap (tried cap/_cap).");
  const raised = await callFirst<bigint>(cs, ["weiRaised", "_weiRaised", "totalRaised", "raised"]) ?? 0n;

  const remaining = cap - raised;
  console.log("Crowdsale:", crowdsaleAddr);
  console.log("Cap (wei):", cap.toString(), `(~${fmtEth(cap)} ETH)`);
  console.log("Raised (wei):", raised.toString(), `(~${fmtEth(raised)} ETH)`);
  console.log("Remaining to cap (wei):", remaining.toString(), `(~${fmtEth(remaining)} ETH)`);

  if (remaining <= 0n) {
    console.log("✅ Already at or over cap. Trying +1 wei should revert...");
    try {
      await cs.buyTokens({ value: 1n });
      console.log("❌ Over-cap buy unexpectedly succeeded");
    } catch {
      console.log("✅ Over-cap buy correctly reverted");
    }
    return;
  }

  // Safety limit for automated spend
  const MAX_AUTOSPEND = ethers.parseEther("0.01"); // 0.01 ETH

  if (remaining <= MAX_AUTOSPEND) {
    console.log(`Attempting to buy EXACT remaining (${remaining.toString()} wei) to hit cap...`);
    const tx1 = await cs.buyTokens({ value: remaining });
    await tx1.wait();
    console.log("✅ Cap reached. Now testing +1 wei over-cap revert...");

    try {
      await cs.buyTokens({ value: 1n });
      console.log("❌ Over-cap buy unexpectedly succeeded");
    } catch {
      console.log("✅ Over-cap buy correctly reverted");
    }
  } else {
    console.log(
      `⚠️ Remaining (${fmtEth(remaining)} ETH) is greater than the auto-spend limit (${fmtEth(MAX_AUTOSPEND)} ETH).`
    );
    console.log("Skipping exact-cap test to avoid spending too much on testnet.");
    console.log("Tip: Re-run this once remaining ≤ 0.01 ETH, or temporarily raise MAX_AUTOSPEND in the script.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
