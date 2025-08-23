import hre, { ethers, network } from "hardhat";
import { readAddresses } from "../utils/addresses";

function first<T>(...vals: (T | undefined | null | "" )[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v as T;
}

async function callFirst<T = any>(
  c: any,
  fns: string[],
  ...args: any[]
): Promise<T | undefined> {
  for (const fn of fns) {
    try {
      if (typeof (c as any)[fn] === "function") {
        const res = await (c as any)[fn](...args);
        if (res !== undefined) return res as T;
      }
    } catch (_) {
      /* try next */
    }
  }
  return undefined;
}

function assertAddress(name: string, val?: string) {
  if (!val || !val.startsWith("0x") || val.length < 42) {
    throw new Error(`Missing or invalid ${name}: "${val ?? ""}"`);
  }
}

async function main() {
  const net = network.name;
  const addrs = await readAddresses(net);

  // 1) Resolve crowdsale address from env or deployments
  const envCrowdsale = (process.env.CROWDSALE_ADDRESS || process.env.CROWDSALE || "").trim();
  const fileCrowdsale = addrs.Crowdsale;
  const crowdsaleAddr = first<string>(envCrowdsale, fileCrowdsale);
  assertAddress("CROWDSALE_ADDRESS", crowdsaleAddr);

  // 2) Attach to Crowdsale
  const crowdsale = await ethers.getContractAt("Crowdsale", crowdsaleAddr!);

  // 3) Probe likely getters
  const tokenAddr = await callFirst<string>(crowdsale, ["tokenAddress", "token"]);
  const rateBN     = await callFirst<bigint>(crowdsale, ["rate", "_rate"]);
  const capBN      = await callFirst<bigint>(crowdsale, ["cap", "_cap"]);
  const nftAddr    = await callFirst<string>(crowdsale, ["nftAddress", "nft"]);

  console.log("Crowdsale @", crowdsaleAddr);
  console.log({
    tokenAddr,
    rate: rateBN?.toString(),
    cap: capBN?.toString(),
    nftAddr,
  });

  const ONE = 10n ** 18n;
    if (rateBN) {
      console.log("Rate (tokens/ETH):", (rateBN / ONE).toString(), "(scaled by 1e18)");
    }
    if (capBN) {
      console.log("Cap:", (capBN / ONE).toString(), "ETH");
    }

  // 4) If we have a token, read a bit of metadata
  if (tokenAddr) {
    assertAddress("TOKEN_ADDRESS (from contract)", tokenAddr);
    const erc20 = await ethers.getContractAt("IERC20", tokenAddr);
    const name = await callFirst<string>(erc20, ["name"]);
    const symbol = await callFirst<string>(erc20, ["symbol"]);
    const decimals = await callFirst<number>(erc20, ["decimals"]);
    console.log({ token: { name, symbol, decimals } });
  } else {
    console.log("⚠️ tokenAddr not exposed by Crowdsale getters (token/tokenAddress).");
  }

  // 5) Friendly assertions so CI fails loudly if wiring is wrong
  if (!rateBN || !capBN) {
    throw new Error("❌ Could not read rate or cap from Crowdsale (tried rate/_rate and cap/_cap).");
  }
  if (!nftAddr) {
    console.log("⚠️ nftAddress not exposed (tried nftAddress/nft). If expected, ignore.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
