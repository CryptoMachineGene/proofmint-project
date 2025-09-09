import { ethers } from "ethers";
import EthereumProvider from "@walletconnect/ethereum-provider";
import {
  CHAIN_ID, CHAIN_ID_HEX_STR,
  CROWDSALE_ADDR, NFT_ADDR, FALLBACK_RPC, WC_PROJECT_ID
} from "../config";



const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

export type WalletKind = "Injected" | "WalletConnect";

let injectedProvider: ethers.BrowserProvider | null = null;
let wcProvider: any | null = null;
let wcEthersProvider: ethers.BrowserProvider | null = null;


// Generic provider for contracts (same order, then readonly)
function pickProvider(p?: ethers.Signer | ethers.Provider) {
  if (p) return p;
  if (injectedProvider) return injectedProvider;
  if (wcEthersProvider) return wcEthersProvider;
  const ro = getReadonly();
  if (ro) return ro;
  throw new Error("No provider available (connect a wallet or set VITE_FALLBACK_RPC).");
}

// ----- Wallet connect helpers (unchanged) -----
export const hasInjected = () =>
  typeof window !== "undefined" && (window as any).ethereum;

export async function connectInjected(): Promise<ethers.Signer> {
  if (!hasInjected()) throw new Error("No injected wallet found.");
  injectedProvider = new ethers.BrowserProvider((window as any).ethereum);
  await injectedProvider.send("eth_requestAccounts", []);
  const net = await injectedProvider.getNetwork();
  if (Number(net.chainId) !== CHAIN_ID) {
    await (window as any).ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX_STR }],
    });
  }
  return injectedProvider.getSigner();
}

export async function connectWalletConnect(): Promise<ethers.Signer> {
  if (!WC_PROJECT_ID) throw new Error("Missing WalletConnect project id.");
  if (!wcProvider) {
    wcProvider = await EthereumProvider.init({
      projectId: WC_PROJECT_ID,
      chains: [CHAIN_ID],
      optionalChains: [CHAIN_ID],
      showQrModal: true,
      metadata: { name: "Proofmint", description: "Proofmint dApp", url: "https://example.org", icons: [] },
    });
  }
  await wcProvider.enable();
  wcEthersProvider = new ethers.BrowserProvider(wcProvider);
  return wcEthersProvider.getSigner();
}


export async function getCrowdsaleContract(p?: ethers.Signer | ethers.Provider) {
  if (!CROWDSALE_ADDR) throw new Error("Crowdsale address not set.");
  return new ethers.Contract(CROWDSALE_ADDR, CROWDSALE_ABI, pickProvider(p));
}
export async function getNftContract(p?: ethers.Signer | ethers.Provider) {
  if (!NFT_ADDR) throw new Error("NFT address not set.");
  return new ethers.Contract(NFT_ADDR, NFT_ABI, pickProvider(p));
}

// ----- Utility -----
function bestErr(e: any) {
  return e?.shortMessage || e?.info?.error?.message || e?.cause?.reason || e?.message || String(e);
}

// Count mints via Transfer(from=0x0, *, *) in adaptive block chunks
// --- DEBUG version: chunked scan with detailed logging + guards
// --- helper (top of file or above mintedViaLogs) ---
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// count mints by querying Transfer(from=0x0, any to, any tokenId) with adaptive chunking
async function mintedViaLogs(): Promise<bigint> {
  const provider =
    getReadonly() ??
    injectedProvider ??
    wcEthersProvider;

  if (!provider) throw new Error("No provider available for logs.");
  if (!NFT_ADDR) throw new Error("NFT address not set.");

  // start optimistic, adapt down if the RPC rejects the range
  let step = 30;                 // was 100
  const minStep = 3;             // was 5 (let it shrink a bit further)

  // small delay helper
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  const fromTopic = ethers.zeroPadValue(ZERO_ADDR, 32);

  const latest = Number(await (provider as any).getBlockNumber?.() ?? 0);
  const start  = Number(NFT_DEPLOY_BLOCK);
  if (!Number.isFinite(latest) || latest <= 0 || latest < start) {
    throw new Error(`Invalid block range: start=${start}, latest=${latest}`);
  }

  let total = 0n;
  let from  = start;

  // simple heuristics to detect "block range too large" errors
  const rangeTooLarge = (err: any) => {
    const m = (err?.message || err?.data?.message || "").toLowerCase();
    return m.includes("block range") || m.includes("getlogs") || m.includes("free tier");
  };

  // basic rate-limit/temporary error sniff
  const maybeRateLimited = (err: any) => {
    const m = (err?.message || err?.data?.message || "").toLowerCase();
    const code = err?.code ?? err?.status;
    return code === 429 || m.includes("rate") || m.includes("too many") || m.includes("retry");
  };

  console.debug(`[mintedViaLogs] scanning ${start} → ${latest} (initial step=${step})`);

  while (from <= latest) {
    let to = Math.min(from + step - 1, latest);

    const filter = {
      address: NFT_ADDR,
      fromBlock: from,
      toBlock: to,
      topics: [TRANSFER_TOPIC, fromTopic, null, null],
    } as any;

    try {
      const logs = await (provider as any).getLogs(filter);
      total += BigInt(logs.length);

      // brief back-off to avoid free-tier throttling
      await sleep(250);

      from = to + 1;

      // if we had shrunk step previously and things are stable, we can cautiously grow it back
      if (step < 100) step = Math.min(100, step + 5);

    } catch (e: any) {
      if (rangeTooLarge(e) && step > minStep) {
        // shrink step and retry the SAME window with smaller range
        step = Math.max(minStep, Math.floor(step / 2));
        // console.warn(`[mintedViaLogs] RPC rejected range ${from}-${to}; retrying with smaller step=${step}`);
        continue;
      }
      if (maybeRateLimited(e)) {
        // small backoff then retry the SAME window
        await sleep(350);
        continue;
      }
      // hard failure: surface the error
      console.warn(`[mintedViaLogs] window ${from}-${to} failed:`, e);
      throw e;
    }
  }

  return total;
}

// Try buy functions safely (staticCall first), unchanged style
const BUY_FN_CANDIDATES = ["buy", "buyTokens", "purchase", "contribute", "mint", "mintPublic"];
export async function buyTokensSmart(ethAmount: string, signer?: ethers.Signer) {
  if (!signer) throw new Error("Connect a wallet first.");
  const sale = await getCrowdsaleContract(signer);
  const value = ethers.parseEther(ethAmount);

  for (const fn of BUY_FN_CANDIDATES) {
    try {
      const candidate = (sale as any)[fn];
      if (typeof candidate !== "function") continue;

  }
  try { const tx = await signer.sendTransaction({ to: CROWDSALE_ADDR, value }); return tx.wait(); }
  catch (e: any) { throw new Error("Purchase failed. " + bestErr(e)); }
}

// Small helper (unused here but kept)
async function tryGet<T = any>(obj: any, names: string[]): Promise<{ name: string; value: T | null }> {
  for (const n of names) { try { if (typeof obj[n] === "function") return { name: n, value: await obj[n]() }; } catch {} }
  return { name: "", value: null };
}

// resolve with a value or reject after `ms` (prevents UI from hanging forever)
function withTimeout<T>(p: Promise<T>, ms = 8000, label = "op"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`[timeout] ${label} exceeded ${ms}ms`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

// ----- Read state (never throws) -----
export async function readState() {
  const sale = await getCrowdsaleContract();
  const nft  = await getNftContract();

  const [rate, cap, weiRaised] = await Promise.all([sale.rate(), sale.cap(), sale.weiRaised()]);

// minted via logs (fallback that works even if totalSupply() reverts)
let mintedBI: bigint | null = null;
  try {

  const capWei = BigInt(cap.toString());
  const raisedWei = BigInt(weiRaised.toString());
  const remaining = capWei > raisedWei ? capWei - raisedWei : 0n;

  return {
    rate: rate.toString(),
    cap: capWei.toString(),
    weiRaised: raisedWei.toString(),
    nftsMinted: mintedBI !== null ? mintedBI.toString() : "N/A",
    capRemainingWei: remaining.toString(),
  };
}

export const usingFallbackRPC = !!FALLBACK_RPC;
export async function readDashboard() { return readState(); }
