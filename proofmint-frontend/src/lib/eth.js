import { ethers } from "ethers";

export function getProvider() {
  if (!window.ethereum) throw new Error("No injected wallet found");
  return new ethers.BrowserProvider(window.ethereum);
}

export async function getSigner() {
  const provider = getProvider();
  return await provider.getSigner();
}

export async function requestAccounts() {
  if (!window.ethereum) throw new Error("No injected wallet found");
  return await window.ethereum.request({ method: "eth_requestAccounts" });
}

export function onWalletEvents({ onAccounts, onChain }) {
  if (!window.ethereum) return () => {};
  const acc = (a) => onAccounts?.(a);
  const chn = (c) => onChain?.(c);
  window.ethereum.on?.("accountsChanged", acc);
  window.ethereum.on?.("chainChanged", chn);
  return () => {
    window.ethereum.removeListener?.("accountsChanged", acc);
    window.ethereum.removeListener?.("chainChanged", chn);
  };
}
