import {
  BrowserProvider,
  JsonRpcProvider,
  Contract,
  parseEther,
  formatEther,
  formatUnits,   
} from "ethers";
import {
  NETWORK,
  CHAIN_ID,
  CHAIN_ID_HEX, 
  FALLBACK_RPC,
  CROWDSALE_ADDRESS,
  TOKEN_ADDRESS,
  NFT_ADDRESS, // (not used here but exported in case you need it)
} from "../config";

// Minimal ABIs used by the UI (inline to avoid path issues)
const CROWDSALE_ABI = [
  "function withdraw()",
  "function rate() view returns (uint256)",
  "function cap() view returns (uint256)",
  "function weiRaised() view returns (uint256)",
  // If your sale *requires* a payable function instead of raw ETH send:
  // "function buyTokens() payable"
];

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
];

export type WalletState = {
  account: string | null;
  chainId: string | null; // hex
  provider: BrowserProvider | null;
};

export type SaleState = {
  capEth: string | null;
  raisedEth: string | null;
  rate: string | null;
  userToken: string | null;
  tokenSym: string | null;
  balanceEth: string | null; 
};


// ---------- providers ----------
let injected: BrowserProvider | null = null;
let readonlyRpc: JsonRpcProvider | null = null;

function getReadonly(): JsonRpcProvider | null {
  if (!FALLBACK_RPC || !/^https?:\/\//i.test(FALLBACK_RPC)) return null;
  if (!readonlyRpc) {
    try {
      readonlyRpc = new JsonRpcProvider(FALLBACK_RPC, CHAIN_ID);
    } catch {
      readonlyRpc = null;
    }
  }
  return readonlyRpc;
}

export const hasInjected = () =>
  typeof window !== "undefined" && (window as any).ethereum;

// ---------- connect ----------
export async function connectInjected(): Promise<WalletState> {
  if (!hasInjected()) throw new Error("No injected wallet found.");
  injected = new BrowserProvider((window as any).ethereum);
  const accounts: string[] = await injected.send("eth_requestAccounts", []);
  const net = await injected.getNetwork();
  const chainIdHex = "0x" + Number(net.chainId).toString(16);

  if (Number(net.chainId) !== CHAIN_ID) {
    await (window as any).ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  }

  return {
    account: accounts[0] ?? null,
    chainId: chainIdHex,
    provider: injected,
  };
}

// ---------- contracts ----------
function getContracts(provider: BrowserProvider | JsonRpcProvider) {
  if (!CROWDSALE_ADDRESS) throw new Error("Crowdsale address not set in .env.local");
  const crowdsale = new Contract(CROWDSALE_ADDRESS, CROWDSALE_ABI, provider);
  const token = TOKEN_ADDRESS ? new Contract(TOKEN_ADDRESS, ERC20_ABI, provider) : null;
  return { crowdsale, token };
}

// ---------- actions ----------

// Direct send first; if wallet rejects or contract needs a method, try buyTokens()
export async function buyWithAuto(provider: BrowserProvider, ethAmount: string) {
  const signer = await provider.getSigner();
  if (!CROWDSALE_ADDRESS) throw new Error("Crowdsale address not set.");
  const value = parseEther(ethAmount);

  // try plain ETH send to the sale
  try {
    const tx = await signer.sendTransaction({ to: CROWDSALE_ADDRESS, value });
    return tx; // return tx so UI can read tx.hash, then await tx.wait() itself
  } catch (e) {
    // fallback to explicit payable function, if present
    const sale = new Contract(CROWDSALE_ADDRESS, CROWDSALE_ABI, signer) as any;
    if (typeof sale.buyTokens === "function") {
      const tx = await sale.buyTokens({ value });
      return tx;
    }
    throw e;
  }
}

// Back-compat: allow components still importing buyETH to work
export const buyETH = buyWithAuto;

export async function withdrawRaised(provider: BrowserProvider) {
  if (!CROWDSALE_ADDRESS) throw new Error("Missing crowdsale address.");
  const signer = await provider.getSigner();
  const sale = new Contract(CROWDSALE_ADDRESS, ["function withdraw()"], signer);
  const tx = await sale.withdraw();
  return tx; // caller may await tx.wait()
}

export async function fetchSaleState(
  provider?: BrowserProvider,
  account?: string | null
): Promise<SaleState> {
  const ro = getReadonly() ?? provider ?? injected;
  if (!ro) throw new Error("No provider available (connect a wallet or set FALLBACK_RPC).");

  const { crowdsale, token } = getContracts(ro);

  let capEth: string | null = null;
  let raisedEth: string | null = null;
  let rate: string | null = null;          // human: tokens per ETH
  let balanceEth: string | null = null;    // ETH held by the sale
  let userToken: string | null = null;
  let tokenSym: string | null = null;

  // Cap / Raised
  try { capEth = formatEther(await crowdsale.cap()); } catch {}
  try { raisedEth = formatEther(await crowdsale.weiRaised()); } catch {}

  // ---- RATE (human): tokens per ETH (auto-detect per-wei vs per-ETH) ----
  try {
    const rateRaw: bigint = await crowdsale.rate(); // token UNITS per ? (wei or ETH)
    if (TOKEN_ADDRESS) {
      const t = new Contract(TOKEN_ADDRESS, ERC20_ABI, ro);
      const [dec, sym] = await Promise.all([t.decimals(), t.symbol()]);
      tokenSym = sym;

      const pow18 = 10n ** 18n;
      const perEth_ifPerWei = Number(formatUnits(rateRaw * pow18, dec)); // if per WEI
      const perEth_ifPerEth = Number(formatUnits(rateRaw, dec));         // if per ETH
      const chosen = perEth_ifPerWei >= 1e12 ? perEth_ifPerEth : perEth_ifPerWei;

      rate = Number.isFinite(chosen) ? String(chosen) : null;
    } else {
      rate = rateRaw.toString();
    }
  } catch {}

  // ---- SALE ETH BALANCE (zero-safe with fallback) ----
  try {
    const saleAddr = await crowdsale.getAddress();
    const bal = await ro.getBalance(saleAddr);              // works for BrowserProvider & JsonRpcProvider
    balanceEth = formatEther(bal ?? 0n);
  } catch {
    try {
      const rpc = getReadonly();
      const saleAddr = await crowdsale.getAddress();
      const bal2 = rpc ? await rpc.getBalance(saleAddr) : 0n;
      balanceEth = formatEther(bal2);
    } catch {
      balanceEth = "0"; // last resort: show 0 instead of "—"
    }
  }

  // ---- USER TOKEN BALANCE (optional; only if connected + TOKEN_ADDRESS) ----
  if (token && account) {
    try {
      const [raw, sym, dec] = await Promise.all([
        token.balanceOf(account),
        token.symbol(),
        token.decimals(),
      ]);
      tokenSym = tokenSym ?? sym;
      userToken = (Number(raw) / 10 ** Number(dec)).toString();
    } catch {}
  }

  return { capEth, raisedEth, rate, userToken, tokenSym, balanceEth };
}

