// proofmint-frontend/src/lib/eth.ts
import { ethers } from "ethers";
import EthereumProvider from "@walletconnect/ethereum-provider";
import {
  CHAIN_ID, CHAIN_ID_HEX_STR,
  CROWDSALE_ADDR, NFT_ADDR, FALLBACK_RPC, WC_PROJECT_ID
} from "../config";


// -------------------------------
// NFT mint count via logs
// -------------------------------
const NFT_DEPLOY_BLOCK = 9007802n;

// count mints by querying Transfer(from=0x0, any to, any tokenId) in small block chunks
async function mintedViaLogs(): Promise<bigint> {
  const provider =
    getReadonly() ??
    injectedProvider ??
    wcEthersProvider;

  if (!provider) throw new Error("No provider available for logs.");
  if (!NFT_ADDR) throw new Error("NFT address not set.");

  // keep chunks comfortably under free-tier limits
  const STEP = 80; // blocks per query (tweak if needed)

  // v6 providers return number for getBlockNumber()
  const latest = Number(await (provider as any).getBlockNumber?.() ?? 0);
  const start  = Number(NFT_DEPLOY_BLOCK);

  if (!Number.isFinite(latest) || latest <= 0 || latest < start) {
    throw new Error(`Invalid block range for logs: start=${start}, latest=${latest}`);
  }

  let total = 0n;
  const fromTopic = ethers.zeroPadValue(ZERO_ADDR, 32);

  for (let from = start; from <= latest; from += STEP) {
    const to = Math.min(from + STEP - 1, latest);

    const filter = {
      address: NFT_ADDR,
      fromBlock: from,
      toBlock: to,
      topics: [TRANSFER_TOPIC, fromTopic, null, null],
    } as any;

    try {
      const logs = await (provider as any).getLogs(filter);
      total += BigInt(logs.length);
    } catch (e: any) {
      console.warn(`mintedViaLogs: window ${from}-${to} failed:`, e?.message ?? e);
      throw e;
    }
  }

  return total;
}

// -------------------------------
// Minimal ABIs (adjust if names differ)
// -------------------------------
const CROWDSALE_ABI = [
  "function buy() payable",
  "function buyTokens() payable",
  "function rate() view returns (uint256)",
  "function cap() view returns (uint256)",
  "function weiRaised() view returns (uint256)",
];
const NFT_ABI = [
  "function totalSupply() view returns (uint256)",
];

// -------------------------------
// Wallet plumbing
// -------------------------------
export type WalletKind = "Injected" | "WalletConnect";

let injectedProvider: ethers.BrowserProvider | null = null;
let wcProvider: any | null = null;
let wcEthersProvider: ethers.BrowserProvider | null = null;

// read-only provider if no wallet (lazy)
let _readonlyProvider: ethers.JsonRpcProvider | null = null;

function getReadonly(): ethers.JsonRpcProvider | null {
  if (!FALLBACK_RPC || !/^https?:\/\//i.test(FALLBACK_RPC)) return null;
  if (!_readonlyProvider) {
    try {
      _readonlyProvider = new ethers.JsonRpcProvider(FALLBACK_RPC, CHAIN_ID);
    } catch {
      _readonlyProvider = null; // invalid / unreachable URL
    }
  }
  return _readonlyProvider;
}

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
      metadata: {
        name: "Proofmint",
        description: "Proofmint dApp",
        url: "https://example.org",
        icons: [],
      },
    });
  }
  await wcProvider.enable();
  wcEthersProvider = new ethers.BrowserProvider(wcProvider);
  return wcEthersProvider.getSigner();
}

function pickProvider(p?: ethers.Signer | ethers.Provider) {
  if (p) return p;
  if (injectedProvider) return injectedProvider;
  if (wcEthersProvider) return wcEthersProvider;
  const ro = getReadonly();
  if (ro) return ro;

  throw new Error("No provider available (connect a wallet or set VITE_FALLBACK_RPC).");
}

// -------------------------------
// Contracts
// -------------------------------
export async function getCrowdsaleContract(p?: ethers.Signer | ethers.Provider) {
  if (!CROWDSALE_ADDR) throw new Error("Crowdsale address not set.");
  return new ethers.Contract(CROWDSALE_ADDR, CROWDSALE_ABI, pickProvider(p));
}

export async function getNftContract(p?: ethers.Signer | ethers.Provider) {
  if (!NFT_ADDR) throw new Error("NFT address not set.");
  return new ethers.Contract(NFT_ADDR, NFT_ABI, pickProvider(p));
}

// -------------------------------
// BUY flow (tries common function names, falls back to raw send)
// -------------------------------
const BUY_FN_CANDIDATES = [
  "buy",
  "buyTokens",
  "purchase",
  "contribute",
  "mint",          // some sales/NFTs mint on payable
  "mintPublic",    // common in NFT mints
];

function bestErr(e: any) {
  return e?.shortMessage || e?.info?.error?.message || e?.cause?.reason || e?.message || String(e);
}

export async function buyTokensSmart(ethAmount: string, signer?: ethers.Signer) {
  if (!signer) throw new Error("Connect a wallet first.");
  const sale = await getCrowdsaleContract(signer);
  const value = ethers.parseEther(ethAmount);

  for (const fn of BUY_FN_CANDIDATES) {
    try {
      const candidate = (sale as any)[fn];
      if (typeof candidate !== "function") continue;

      // Dry-run first: static call (no prompt, clean error surface)
      if ((sale as any)[fn].staticCall) {
        await (sale as any)[fn].staticCall({ value });
      } else {
        // ethers v6 canonical path
        await sale.getFunction(fn).staticCall({ value });
      }

      // If static call passed, send the real tx
      const tx = await (sale as any)[fn]({ value });
      return tx.wait();
    } catch {
      // try next candidate
    }
  }

  // Last resort: payable receive()
  try {
    const tx = await signer.sendTransaction({ to: CROWDSALE_ADDR, value });
    return tx.wait();
  } catch (e: any) {
    throw new Error(
      "Purchase failed: no working buy function found (or sale conditions not met). " +
      bestErr(e)
    );
  }
}

// -------------------------------
// Simple sale-state reader (matches our working `cast call`s)
// -------------------------------
export async function fetchSaleState() {
  const provider = hasInjected()
    ? new ethers.BrowserProvider((window as any).ethereum)
    : new ethers.JsonRpcProvider(FALLBACK_RPC);

  const sale = new ethers.Contract(CROWDSALE_ADDR, CROWDSALE_ABI, provider);
  const [rate, cap, raised] = await Promise.all([
    sale.rate(),
    sale.cap(),
    sale.weiRaised(),
  ]);

  return {
    rate: rate.toString(),
    capEth: ethers.formatEther(cap),
    raisedEth: ethers.formatEther(raised),
  };
}

// -------------------------------
// Helper: try a list of candidate getter names (kept if you use elsewhere)
// -------------------------------
async function tryGet<T = any>(obj: any, names: string[]): Promise<{name: string; value: T | null}> {
  for (const n of names) {
    try {
      if (typeof obj[n] === "function") {
        const v = await obj[n]();
        return { name: n, value: v };
      }
    } catch { /* keep trying */ }
  }
  return { name: "", value: null };
}


// -------------------------------
// Dashboard/state aggregator (fixed braces)
// -------------------------------

export async function readState() {
  const sale = await getCrowdsaleContract();

  const [rate, cap, weiRaised] = await Promise.all([
    withTimeout(sale.rate(),      5_000, "rate()"),
    withTimeout(sale.cap(),       5_000, "cap()"),
    withTimeout(sale.weiRaised(), 5_000, "weiRaised()"),
  ]);


  // minted via logs (fallback that works even if totalSupply() reverts)
  let mintedBI: bigint | null = null;
  try {
    const ts = await nft.totalSupply();
    mintedBI = BigInt(ts.toString());
  } catch (e1) {
    try {
      mintedBI = await mintedViaLogs();
    } catch (e2) {
      console.warn("minted read failed (logs + totalSupply):", e1, e2);
      mintedBI = null;
    }
  }


  // normalize to strings
  const rateStr    = BigInt(rate.toString()).toString();
  const capWei     = BigInt(cap.toString());
  const raisedWei  = BigInt(weiRaised.toString());
  const remaining  = capWei > raisedWei ? capWei - raisedWei : 0n;

  return {
    rate: rateStr,                       // <- string
    cap: capWei.toString(),
    weiRaised: raisedWei.toString(),
    nftsMinted: mintedStr,               // <- string or "N/A"
    capRemainingWei: remaining.toString()
  };
}

// -------------------------------
export const usingFallbackRPC = !!FALLBACK_RPC;
export async function readDashboard() { return readState(); }
