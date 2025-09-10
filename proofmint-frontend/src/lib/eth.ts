import { ethers } from "ethers";
import EthereumProvider from "@walletconnect/ethereum-provider";
import {
  CHAIN_ID, CHAIN_ID_HEX_STR,
  CROWDSALE_ADDR, NFT_ADDR, FALLBACK_RPC, WC_PROJECT_ID
} from "../config";

// NFT mint count via logs
const NFT_DEPLOY_BLOCK = 9007802n;

const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";


  const start  = Number(NFT_DEPLOY_BLOCK);
  if (!Number.isFinite(latest) || latest <= 0 || latest < start) {
    throw new Error(`Invalid block range for logs: start=${start}, latest=${latest}`);
  }

  let total = 0n;
  const fromTopic = ethers.zeroPadValue(ZERO_ADDR, 32);

    const filter = {
      address: NFT_ADDR,
      fromBlock: from,
      toBlock: to,
      topics: [TRANSFER_TOPIC, fromTopic, null, null],
    } as any;

    try {
      const logs = await provider.getLogs(filter);
      total += BigInt(logs.length);

    }
  }

  return total;
}

// ABIs (adjust if your function names differ)
const CROWDSALE_ABI = [
  "function buy() payable",
  "function rate() view returns (uint256)",
  "function cap() view returns (uint256)",
  "function weiRaised() view returns (uint256)",
];
const NFT_ABI = [
  "function totalSupply() view returns (uint256)",
];

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

export async function getCrowdsaleContract(p?: ethers.Signer | ethers.Provider) {
  if (!CROWDSALE_ADDR) throw new Error("Crowdsale address not set.");
  return new ethers.Contract(CROWDSALE_ADDR, CROWDSALE_ABI, pickProvider(p));
}

export async function getNftContract(p?: ethers.Signer | ethers.Provider) {
  if (!NFT_ADDR) throw new Error("NFT address not set.");
  return new ethers.Contract(NFT_ADDR, NFT_ABI, pickProvider(p));
}

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

      // Dry-run first: static call (no MetaMask prompt, no spammy "execution reverted")
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
      // Try next candidate silently
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

// helper: try a list of candidate getter names and return the first that works
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

// helper: time-box a promise
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

export async function readState() {
  const sale = await getCrowdsaleContract();
  const nft  = await getNftContract();

  // get the cheap stuff first so UI can render quickly
  const [rate, cap, weiRaised] = await Promise.all([
    sale.rate(),
    sale.cap(),
    sale.weiRaised(),
  ]);

  let mintedStr = "N/A";

  // 1) try logs, but bail fast if slow
  try {
    const viaLogs = await withTimeout(mintedViaLogs(), 2500); // 2.5s budget
    mintedStr = viaLogs.toString();
  } catch (e1) {
    console.warn("mintedViaLogs failed or timed out:", e1);
    // 2) fall back to totalSupply() with a smaller budget
    try {
      const ts = await withTimeout(nft.totalSupply(), 1500);  // 1.5s budget
      mintedStr = BigInt(ts.toString()).toString();
    } catch (e2) {
      console.warn("totalSupply() fallback failed or timed out:", e2);
      // keep "N/A"
    }
  }

  const capWei = BigInt(cap.toString());
  const raisedWei = BigInt(weiRaised.toString());
  const remaining = capWei > raisedWei ? capWei - raisedWei : 0n;

  return {
    rate: rate.toString(),
    cap: capWei.toString(),
    weiRaised: raisedWei.toString(),
    nftsMinted: mintedStr,
    capRemainingWei: remaining.toString(),
  };
}

// (Optional) backwards-compat for older imports
export const usingFallbackRPC = !!FALLBACK_RPC;
export async function readDashboard() { return readState(); }
