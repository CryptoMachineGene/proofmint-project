// Frontend address selector. Import statically so Vite bundles them.
import anvil from "./anvil.json";
import localhost from "./localhost.json";
import sepolia from "./sepolia.json";

// Bundle into one object
const all = { anvil, localhost, sepolia } as const;
export type NetworkKey = keyof typeof all;

export function getAddresses() {
  const name = (import.meta.env.VITE_NETWORK_NAME || "sepolia") as NetworkKey;
  const picked = all[name];
  if (!picked) {
    console.warn(`[addresses] Unknown VITE_NETWORK_NAME=${name}, defaulting to sepolia`);
    return all.sepolia;
  }
  return picked;
}
