// src/env.ts
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 11155111);
export const CHAIN_ID_HEX = (import.meta.env.VITE_CHAIN_ID_HEX ?? "0xaa36a7") as `0x${string}`;
export const FALLBACK_RPC = import.meta.env.VITE_FALLBACK_RPC as string | undefined;

function pick(...keys: string[]) {
  for (const k of keys) {
    const v = (import.meta.env as any)[k];
    if (v) return v as string;
  }
  return undefined;
}

export const CROWDSALE_ADDRESS = pick("VITE_CROWDSALE_ADDRESS", "VITE_CROWDSALE_ADDR");
export const TOKEN_ADDRESS     = pick("VITE_TOKEN_ADDRESS", "VITE_TOKEN_ADDR");
export const NFT_ADDRESS       = pick("VITE_NFT_ADDRESS", "VITE_NFT_ADDR");

export function assertEnv() {
  if (!CROWDSALE_ADDRESS) {
    throw new Error("Missing VITE_CROWDSALE_ADDRESS or VITE_CROWDSALE_ADDR");
  }
}
