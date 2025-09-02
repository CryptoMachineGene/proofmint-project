import { ethers } from "ethers";
import EthereumProvider from "@walletconnect/ethereum-provider";
import {
  CHAIN_ID, CHAIN_ID_HEX_STR,
  CROWDSALE_ADDR, NFT_ADDR, FALLBACK_RPC, WC_PROJECT_ID
} from "../config";

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

export async function buyTokens(ethAmount: string, signer?: ethers.Signer) {
  if (!signer) throw new Error("No signer connected.");
  const sale = await getCrowdsaleContract(signer);
  const value = ethers.parseEther(ethAmount);
  const tx = await sale.buy({ value });
  return tx.wait();
}

export async function readState() {
  const sale = await getCrowdsaleContract();
  const nft = await getNftContract();

  const [rate, cap, weiRaised, totalSupply] = await Promise.all([
    sale.rate(),
    sale.cap(),
    sale.weiRaised(),
    nft.totalSupply(),
  ]);

  const capWei = BigInt(cap.toString());
  const raised = BigInt(weiRaised.toString());
  const remaining = capWei > raised ? (capWei - raised) : 0n;

  return {
    rate: rate.toString(),
    cap: capWei.toString(),
    weiRaised: raised.toString(),
    nftsMinted: totalSupply.toString(),
    capRemainingWei: remaining.toString(),
  };
}

// (Optional) backwards-compat for older imports
export const usingFallbackRPC = !!FALLBACK_RPC;
export async function readDashboard() { return readState(); }
