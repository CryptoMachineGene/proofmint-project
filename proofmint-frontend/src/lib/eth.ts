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

// count mints by querying Transfer(from=0x0, any to, any tokenId)
async function mintedViaLogs(): Promise<bigint> {
  const provider =
    injectedProvider ??
    wcEthersProvider ??
    (FALLBACK_RPC ? new ethers.JsonRpcProvider(FALLBACK_RPC, CHAIN_ID) : null);

  if (!provider) throw new Error("No provider available for logs.");

  const filter = {
    address: NFT_ADDR,
    fromBlock: NFT_DEPLOY_BLOCK,  // number is safest for browsers
    toBlock: "latest",
    topics: [
      TRANSFER_TOPIC,
      ethers.zeroPadValue(ZERO_ADDR, 32), // from = 0x0 ⇒ mint
      null,                               // any "to"
      null,                               // any tokenId
    ],
  } as any;

  try {
    const logs = await (provider as any).getLogs(filter);
    return BigInt(logs.length);
  } catch (e: any) {
    console.error("mintedViaLogs getLogs error:", e);  // <-- see exact reason in console
    // last-resort fallback: try totalSupply() in case it actually works at runtime
    try {
      const nft = await getNftContract();
      const ts = await nft.totalSupply();
      return BigInt(ts.toString());
    } catch (e2) {
      console.error("fallback totalSupply() error:", e2);
      throw e; // let caller show N/A
    }
  }
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

// read-only provider if no wallet
const readonlyProvider: ethers.AbstractProvider | null =
  FALLBACK_RPC ? new ethers.JsonRpcProvider(FALLBACK_RPC, CHAIN_ID) : null;

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
  if (readonlyProvider) return readonlyProvider;
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

  // Try each candidate: first one whose estimateGas succeeds wins.
  for (const fn of BUY_FN_CANDIDATES) {
    try {
      // skip if ABI doesn't expose it
      if (typeof (sale as any)[fn] !== "function") continue;
      // gas check (mimics the tx; will throw if it would revert)
      if (sale.estimateGas && (sale.estimateGas as any)[fn]) {
        await (sale.estimateGas as any)[fn]({ value });
      }
      const tx = await (sale as any)[fn]({ value });
      return tx.wait();
    } catch (e: any) {
      // keep trying next candidate
      // console.debug(`buy candidate ${fn} failed:`, bestErr(e));
    }
  }

  // Last resort: some contracts mint on plain ETH via receive() fallback.
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




export async function readState() {
  const sale = await getCrowdsaleContract();
  const nft  = await getNftContract(); // keep if you still read other NFT funcs

  const [rate, cap, weiRaised] = await Promise.all([
    sale.rate(),
    sale.cap(),
    sale.weiRaised(),
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

// (Optional) backwards-compat for older imports
export const usingFallbackRPC = !!FALLBACK_RPC;
export async function readDashboard() { return readState(); }
