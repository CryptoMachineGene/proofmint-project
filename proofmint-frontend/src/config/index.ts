// src/config/index.ts

// Helper to grab VITE_* values from .env.local
const env = (k: string, required = true) => {
  const v = import.meta.env[`VITE_${k}`] as string | undefined;
  if (required && !v) throw new Error(`Missing VITE_${k} in .env.local`);
  return v;
};

// Core chain + RPC
export const CHAIN_ID = Number(env("CHAIN_ID"));        // e.g. 11155111
export const CHAIN_ID_HEX = env("CHAIN_ID_HEX");        // e.g. 0xaa36a7
export const FALLBACK_RPC = env("FALLBACK_RPC");        // your Alchemy/Infura URL

// Contracts
export const CROWDSALE_ADDRESS = env("CROWDSALE_ADDRESS");
export const TOKEN_ADDRESS = env("TOKEN_ADDRESS", false) || null;
export const NFT_ADDRESS = env("NFT_ADDRESS", false) || null;

// Optional convenience bundle
export const CONTRACTS = {
  crowdsale: CROWDSALE_ADDRESS,
  token: TOKEN_ADDRESS,
  nft: NFT_ADDRESS,
};

// Minimal network helper for auto-switch
export const NETWORK = {
  chainIdHex: CHAIN_ID_HEX,
  name: "Sepolia",
};
