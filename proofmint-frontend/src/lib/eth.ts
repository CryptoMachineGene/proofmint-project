// proofmint-frontend/src/lib/eth.ts
import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  JsonRpcSigner,
  parseEther,
  formatEther,
  type Provider
} from "ethers";
import CrowdsaleABI from "./abis/Crowdsale.json";
import ProofNFTABI from "./abis/ProofNFT.json";
import { CROWDSALE_ADDR, NFT_ADDR, CHAIN_ID_HEX } from "../config";

const FALLBACK_RPC: string | undefined = import.meta.env.VITE_FALLBACK_RPC;

// ───────────────────────────────────────────────────────────────────────────────
// Provider helpers
// ───────────────────────────────────────────────────────────────────────────────
function hasWallet(): boolean {
  return !!(window as any).ethereum;
}

// Read provider: wallet if present (so it auto-updates on chain change), otherwise fallback RPC
export function getReadProvider(): Provider {
  if (hasWallet()) {
    return new BrowserProvider((window as any).ethereum);
  }
  if (!FALLBACK_RPC) {
    throw new Error("Missing VITE_FALLBACK_RPC for read-only mode");
  }
  return new JsonRpcProvider(FALLBACK_RPC);
}

// Wallet provider: requires injected wallet
export async function getWalletProvider(): Promise<BrowserProvider> {
  if (!hasWallet()) throw new Error("No injected wallet found");
  return new BrowserProvider((window as any).ethereum);
}

export async function getSigner(): Promise<JsonRpcSigner> {
  const provider = await getWalletProvider();
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}

// Network guard only when a wallet is present (no-op on fallback)
export async function ensureNetwork(): Promise<void> {
  if (!hasWallet()) return; // can't switch networks without a wallet
  const provider = await getWalletProvider();
  const net = await provider.getNetwork();
  const current = "0x" + BigInt(net.chainId).toString(16);
  if (current.toLowerCase() !== String(CHAIN_ID_HEX).toLowerCase()) {
    await provider.send("wallet_switchEthereumChain", [{ chainId: CHAIN_ID_HEX }]);
  }
}

// Optional: UI can call this to show “Reading from Infura RPC” until a wallet connects
export function usingFallbackRPC(): boolean {
  return !hasWallet();
}

// ───────────────────────────────────────────────────────────────────────────────
// Contracts
// ───────────────────────────────────────────────────────────────────────────────
export function crowdsaleRead(provider: Provider) {
  return new Contract(CROWDSALE_ADDR, CrowdsaleABI as any, provider);
}

export async function crowdsaleWrite() {
  const signer = await getSigner();
  return new Contract(CROWDSALE_ADDR, CrowdsaleABI as any, signer);
}

export function proofNftRead(provider: Provider) {
  return new Contract(NFT_ADDR, ProofNFTABI as any, provider);
}

// ───────────────────────────────────────────────────────────────────────────────
// Actions (aligned to your Solidity)
// ───────────────────────────────────────────────────────────────────────────────
export async function buyTokens(ethAmount: string) {
  await ensureNetwork();
  const sale = await crowdsaleWrite();
  const tx = await sale.buyTokens({ value: parseEther(ethAmount) });
  return tx.wait();
}

export async function withdrawOwner() {
  await ensureNetwork();
  const sale = await crowdsaleWrite();
  const tx = await sale.withdraw();
  return tx.wait();
}

// ───────────────────────────────────────────────────────────────────────────────
// Dashboard (pre-wallet reads via fallback RPC)
// ───────────────────────────────────────────────────────────────────────────────
export async function readDashboard() {
  const provider = getReadProvider();
  const sale = crowdsaleRead(provider);
  const nft = proofNftRead(provider);

  const [rateBn, capWei, raisedWei, nftTotal] = await Promise.all([
    sale.rate(),        // tokens per 1 ETH
    sale.cap(),         // max wei to raise
    sale.weiRaised(),   // total wei raised
    nft.totalSupply(),  // minted receipts
  ]);

  return {
    rate: rateBn.toString(),
    capEth: Number.parseFloat(formatEther(capWei)).toFixed(4),
    raisedEth: Number.parseFloat(formatEther(raisedWei)).toFixed(4),
    nftsMinted: nftTotal.toString(),
  };
}
