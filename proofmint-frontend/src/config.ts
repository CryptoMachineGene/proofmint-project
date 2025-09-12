import Token from "./abis/Token.json";
import ProofNFT from "./abis/ProofNFT.json";
import Crowdsale from "./abis/Crowdsale.json";

export const TOKEN_ABI = Token.abi as const;
export const NFT_ABI   = ProofNFT.abi as const;
export const SALE_ABI  = Crowdsale.abi as const;

// (keep your existing code below)
const hexToDec = (hex?: string) => {
  if (!hex) return undefined;
  try { return parseInt(hex, 16); } catch { return undefined; }
};

const CHAIN_ID_DEC = Number(import.meta.env.VITE_CHAIN_ID ?? NaN);
const CHAIN_ID_HEX = String(import.meta.env.VITE_CHAIN_ID_HEX ?? "").trim();

export const CHAIN_ID =
  Number.isFinite(CHAIN_ID_DEC) ? CHAIN_ID_DEC :
  hexToDec(CHAIN_ID_HEX) ?? 11155111;

export const CHAIN_ID_HEX_STR =
  CHAIN_ID_HEX || ("0x" + CHAIN_ID.toString(16));

export const CROWDSALE_ADDR = String(import.meta.env.VITE_CROWDSALE_ADDR ?? "");
export const NFT_ADDR       = String(import.meta.env.VITE_NFT_ADDR ?? "");
export const TOKEN_ADDR     = String(import.meta.env.VITE_TOKEN_ADDR ?? "");
export const FALLBACK_RPC   = String(import.meta.env.VITE_FALLBACK_RPC ?? "").trim();
export const WC_PROJECT_ID  = (import.meta.env.VITE_WC_PROJECT_ID ?? "").trim();

if (!CROWDSALE_ADDR) console.warn("⚠ VITE_CROWDSALE_ADDR not set");
if (!NFT_ADDR)       console.warn("⚠ VITE_NFT_ADDR not set");
if (!TOKEN_ADDR)     console.warn("⚠ VITE_TOKEN_ADDR not set");
if (!FALLBACK_RPC)   console.warn("ℹ No VITE_FALLBACK_RPC set");
