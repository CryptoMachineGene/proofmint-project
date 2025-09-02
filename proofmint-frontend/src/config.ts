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
export const NFT_ADDR = String(import.meta.env.VITE_NFT_ADDR ?? "");
export const TOKEN_ADDR = String(import.meta.env.VITE_TOKEN_ADDR ?? "");
export const FALLBACK_RPC = String(import.meta.env.VITE_FALLBACK_RPC ?? "").trim();
export const WC_PROJECT_ID = (import.meta.env.VITE_WC_PROJECT_ID ?? "").trim();

if (!CROWDSALE_ADDR) console.warn("⚠ VITE_CROWDSALE_ADDR not set");
if (!NFT_ADDR) console.warn("⚠ VITE_NFT_ADDR not set");
if (!FALLBACK_RPC) console.warn("ℹ No VITE_FALLBACK_RPC set");
