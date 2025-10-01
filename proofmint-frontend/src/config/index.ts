// Safe config: never crash if an env is missing

// tiny getter with defaults + warnings
const getEnv = (
  key: string,
  { required = false, def = "" }: { required?: boolean; def?: string } = {}
) => {
  const raw = ((import.meta.env as any)[`VITE_${key}`] ?? "").toString().trim();
  if (!raw) {
    if (required && !def) {
      console.warn(`[env] VITE_${key} missing — proceeding with no value`);
    } else if (!required && !def) {
      // optional, empty is fine
    } else if (!raw && def) {
      console.warn(`[env] VITE_${key} not set — using default: ${def}`);
    }
    return def;
  }
  return raw;
};

// ----- core chain + rpc -----
export const CHAIN_ID: number = Number(getEnv("CHAIN_ID", { def: "11155111" })) || 11155111;
export const CHAIN_ID_HEX: string = getEnv("CHAIN_ID_HEX", { def: "0xaa36a7" }).toLowerCase();
export const FALLBACK_RPC: string = getEnv("FALLBACK_RPC", {
  // safe public RPC so the app still renders read-only
  def: "https://rpc.sepolia.org",
});

export const NETWORK = {
  chainIdHex: CHAIN_ID_HEX,
  name: "Sepolia",
};

// ----- contracts (optional -> null if absent) -----
const optAddr = (v: string) => (v && v.length ? v : null);

export const CROWDSALE_ADDRESS = optAddr(
  getEnv("CROWDSALE_ADDRESS", { required: false, def: "" })
);
export const TOKEN_ADDRESS = optAddr(getEnv("TOKEN_ADDRESS", { required: false, def: "" }));
export const NFT_ADDRESS = optAddr(getEnv("NFT_ADDRESS", { required: false, def: "" }));

// convenience bundle (unchanged API)
export const CONTRACTS = {
  crowdsale: CROWDSALE_ADDRESS,
  token: TOKEN_ADDRESS,
  nft: NFT_ADDRESS,
};

// debug (feel free to remove later)
console.log("[Config]", {
  CHAIN_ID,
  CHAIN_ID_HEX,
  FALLBACK_RPC: FALLBACK_RPC?.slice(0, 36) + "…",
  CROWDSALE_ADDRESS,
  TOKEN_ADDRESS,
  NFT_ADDRESS,
});
