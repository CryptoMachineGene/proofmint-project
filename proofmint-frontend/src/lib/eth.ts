// proofmint-frontend/src/lib/eth.ts
import { ethers } from "ethers";

// Load addresses depending on VITE_NETWORK_NAME
export function getAddresses() {
  const net = import.meta.env.VITE_NETWORK_NAME || "anvil";
  try {
    return require(`../addresses/${net}.json`);
  } catch {
    console.warn(`⚠️ No addresses file for ${net}, returning {}`);
    return {};
  }
}

export function getProvider() {
  const rpc = import.meta.env.VITE_FALLBACK_RPC;
  return new ethers.JsonRpcProvider(rpc);
}

export function getContracts() {
  const addrs = getAddresses();
  const provider = getProvider();

  return {
    token: addrs.Token ? new ethers.Contract(addrs.Token, [], provider) : null,
    proofNft: addrs.ProofNFT ? new ethers.Contract(addrs.ProofNFT, [], provider) : null,
    crowdsale: addrs.Crowdsale ? new ethers.Contract(addrs.Crowdsale, [], provider) : null,
  };
}
