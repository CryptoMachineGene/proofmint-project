import { BrowserProvider, JsonRpcProvider, Contract, formatUnits, parseEther } from "ethers";


// --- Minimal ABIs (keep lean)
export const CROWDSALE_ABI = [
  "function rate() view returns (uint256)",
  "function cap() view returns (uint256)",
  "function weiRaised() view returns (uint256)",
  "function token() view returns (address)",
  "function buyTokens(address beneficiary) payable",
];


export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
];


export const ADDR = {
  CROWDSALE: import.meta.env.VITE_CROWDSALE_ADDRESS,
  TOKEN: import.meta.env.VITE_TOKEN_ADDRESS || undefined,
};


export const RPC = {
  SEPOLIA: import.meta.env.VITE_SEPOLIA_RPC,
  CHAIN_ID: 11155111,
};


export function getReadonlyProvider() {
  const url = RPC.SEPOLIA;
  if (!url) throw new Error("Missing VITE_SEPOLIA_RPC in .env.local");
  return new JsonRpcProvider(url, RPC.CHAIN_ID);
}


export async function getWalletProvider() {
  // Prefer Brave Wallet if present; fallback to any injected
  const eth = window?.ethereum;
  if (!eth) return null;
  // If multiple providers (e.g., MetaMask+Brave), prefer Brave when default set
  if (eth.providers?.length) {
    const brave = eth.providers.find(p => p.isBraveWallet);
    if (brave) return new BrowserProvider(brave);
    const metamask = eth.providers.find(p => p.isMetaMask);
    if (metamask) return new BrowserProvider(metamask);
    return new BrowserProvider(eth.providers[0]);
    }
  return new BrowserProvider(eth);
}


export async function connectWallet() {
  const provider = await getWalletProvider();
  if (!provider) throw new Error("No injected wallet found (Brave/MetaMask)");
  const accounts = await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  return { provider, signer, account: accounts?.[0] ?? (await signer.getAddress())
};

export function crowdsaleReadonly() {
  if (!ADDR.CROWDSALE) throw new Error("Missing VITE_CROWDSALE_ADDRESS");
  return new Contract(ADDR.CROWDSALE, CROWDSALE_ABI, getReadonlyProvider());
}

export async function resolveTokenAddress() {
  if (ADDR.TOKEN) return ADDR.TOKEN;
  const cs = crowdsaleReadonly();
  return await cs.token();
}

export async function tokenReadonly() {
  const tokenAddr = await resolveTokenAddress();
  return new Contract(tokenAddr, ERC20_ABI, getReadonlyProvider());
}

export async function readCrowdsaleStats() {
  const cs = crowdsaleReadonly();
  const [rate, capWei, raisedWei, tokenAddr] = await Promise.all([
    cs.rate(),
    cs.cap(),
    cs.weiRaised(),
    cs.token(),
]);


// token metadata
const tok = new Contract(tokenAddr, ERC20_ABI, getReadonlyProvider());
const [name, symbol, decimals] = await Promise.all([
  tok.name(), tok.symbol(), tok.decimals()
]);


return {
  rate: BigInt(rate.toString()),
  capWei: BigInt(capWei.toString()),
  raisedWei: BigInt(raisedWei.toString()),
  token: { address: tokenAddr, name, symbol, decimals: Number(decimals) },
  };
}


export function shorten(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export async function buyTokensETH({ ethAmount, beneficiary }) {
  if (!ADDR.CROWDSALE) throw new Error("Missing crowdsale address");
  const wallet = await getWalletProvider();
  if (!wallet) throw new Error("No wallet");
  const signer = await wallet.getSigner();
  const cs = new Contract(ADDR.CROWDSALE, CROWDSALE_ABI, signer);
  const tx = await cs.buyTokens(beneficiary, { value: parseEther(ethAmount) });
  return await tx.wait();
}

export async function switchToSepolia() {
  const eth = window?.ethereum;
  if (!eth) throw new Error("No injected wallet available");
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xAA36A7" }], // 11155111
    });
  } catch (err) {
  // If chain not added
    if (err?.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0xAA36A7",
          chainName: "Sepolia",
          nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: [RPC.SEPOLIA],
          blockExplorerUrls: ["https://sepolia.etherscan.io"],
        }],
      });
    } else {
    throw err;
    }
  }
}
