import deployRaw from "./addresses/sepolia.json"; // synced by dev:sepolia

type DeployJson = Record<string, string>;
const deploy = (deployRaw as unknown as DeployJson) ?? {};

// Flexible key mapping
const jsonCrowdsale =
  deploy.Crowdsale ?? deploy.crowdsale ?? deploy.crowdsaleAddress ?? deploy.sale ?? deploy.CROWDSALE;
const jsonToken =
  deploy.Token ?? deploy.token ?? deploy.tokenAddress ?? deploy.TOKEN;
const jsonNft =
  deploy.ProofNFT ?? deploy.proofnft ?? deploy.nft ?? deploy.nftAddress ?? deploy.NFT;

// Chain config (defaults to Sepolia)
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 11155111);
export const CHAIN_ID_HEX = (import.meta.env.VITE_CHAIN_ID_HEX ?? "0xaa36a7") as `0x${string}`;
export const FALLBACK_RPC = (import.meta.env.VITE_FALLBACK_RPC as string | undefined) || undefined;

// Prefer .env, but ignore blanks; fallback to JSON
function pick(...keys: string[]) {
  for (const k of keys) {
    const v = (import.meta.env as any)[k];
    if (v && String(v).trim()) return String(v).trim();
  }
  return undefined;
}

export const CROWDSALE_ADDRESS =
  pick("VITE_CROWDSALE_ADDRESS", "VITE_CROWDSALE_ADDR") ?? jsonCrowdsale;
export const TOKEN_ADDRESS =
  pick("VITE_TOKEN_ADDRESS", "VITE_TOKEN_ADDR") ?? jsonToken;
export const NFT_ADDRESS =
  pick("VITE_NFT_ADDRESS", "VITE_NFT_ADDR") ?? jsonNft;

export const CONTRACTS = {
  crowdsale: CROWDSALE_ADDRESS,
  token: TOKEN_ADDRESS,
  nft: NFT_ADDRESS,
};
