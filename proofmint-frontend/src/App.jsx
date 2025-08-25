import { useEffect, useMemo, useState } from "react";
import { BrowserProvider, JsonRpcProvider, Contract, parseEther, formatUnits } from "ethers";



// ---- ENV + constants (match your .env.local names) ----
const RPC = {
  SEPOLIA: import.meta.env.VITE_FALLBACK_RPC, // you’re using VITE_FALLBACK_RPC
  CHAIN_ID: 11155111,
};
const ADDR = {
  CROWDSALE: import.meta.env.VITE_CROWDSALE_ADDRESS,
  TOKEN: import.meta.env.VITE_TOKEN_ADDRESS || undefined, // optional override
};

// ---- Providers ----
function getReadonlyProvider() {
  if (!RPC.SEPOLIA) throw new Error("Missing VITE_FALLBACK_RPC");
  return new JsonRpcProvider(RPC.SEPOLIA, RPC.CHAIN_ID);
}
async function getWalletProvider() {
  const eth = window?.ethereum;
  if (!eth) return null;
  if (eth.providers?.length) {
    const brave = eth.providers.find(p => p.isBraveWallet);
    if (brave) return new BrowserProvider(brave);
    const metamask = eth.providers.find(p => p.isMetaMask);
    if (metamask) return new BrowserProvider(metamask);
    return new BrowserProvider(eth.providers[0]);
  }
  return new BrowserProvider(eth);
}
async function connectWallet() {
  const provider = await getWalletProvider();
  if (!provider) throw new Error("No injected wallet found (Brave/MetaMask)");
  const accounts = await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  return { provider, signer, account: accounts?.[0] ?? (await signer.getAddress()) };
}

// ---- ABIs ----
const CROWDSALE_ABI = [
  "function rate() view returns (uint256)",
  "function cap() view returns (uint256)",
  "function weiRaised() view returns (uint256)",
  "function token() view returns (address)",
  "function buyTokens(address beneficiary) payable",
];
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
];

// ---- Read-only contracts ----
function crowdsaleReadonly() {
  if (!ADDR.CROWDSALE) throw new Error("Missing VITE_CROWDSALE_ADDRESS");
  return new Contract(ADDR.CROWDSALE, CROWDSALE_ABI, getReadonlyProvider());
}
async function resolveTokenAddress() {
  if (ADDR.TOKEN) return ADDR.TOKEN;
  const cs = crowdsaleReadonly();
  return await cs.token();
}

async function readCrowdsaleStats() {
  const provider = await getAnyProvider();
  const cs = new Contract(ADDR.CROWDSALE, CROWDSALE_ABI, provider);

  const [rate, capWei, raisedWei, tokenAddr] = await withTimeout(Promise.all([
    cs.rate(), cs.cap(), cs.weiRaised(), cs.token()
  ]));

  const tok = new Contract(tokenAddr, ERC20_ABI, provider);
  const [name, symbol, decimals] = await withTimeout(Promise.all([
    tok.name(), tok.symbol(), tok.decimals()
  ]));

  return {
    rate: BigInt(rate.toString()),
    capWei: BigInt(capWei.toString()),
    raisedWei: BigInt(raisedWei.toString()),
    token: { address: tokenAddr, name, symbol, decimals: Number(decimals) },
  };
}

// Prefer wallet provider (no CORS), fallback to RPC
async function getAnyProvider() {
  const eth = window?.ethereum;
  if (eth) {
    const pick = eth.providers?.find(p => p.isBraveWallet)
             ?? eth.providers?.find(p => p.isMetaMask)
             ?? eth;
    try {
      return new BrowserProvider(pick); // works for reads without requesting accounts
    } catch {}
  }
  // fallback to your read-only RPC (must be CORS-friendly if no wallet)
  return new JsonRpcProvider(import.meta.env.VITE_FALLBACK_RPC, 11155111);
}

// Guard so the UI can’t hang forever
function withTimeout(promise, ms = 9000) {
  let t;
  const timeout = new Promise((_, rej) => { t = setTimeout(() => rej(new Error("RPC timeout")), ms); });
  return Promise.race([promise.finally(() => clearTimeout(t)), timeout]);
}

// ---- Actions ----
async function buyTokensETH({ ethAmount, beneficiary }) {
  if (!ADDR.CROWDSALE) throw new Error("Missing crowdsale address");
  const wallet = await getWalletProvider();
  if (!wallet) throw new Error("No wallet");
  const signer = await wallet.getSigner();
  const cs = new Contract(ADDR.CROWDSALE, CROWDSALE_ABI, signer);
  const tx = await cs.buyTokens(beneficiary, { value: parseEther(ethAmount) });
  return await tx.wait();
}
async function switchToSepolia() {
  const eth = window?.ethereum;
  if (!eth) throw new Error("No injected wallet available");
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xAA36A7" }] });
  } catch (err) {
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

// ---- UI helpers ----
function shorten(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}


export default function App() {
// --- UI State
const [account, setAccount] = useState("");
const [connecting, setConnecting] = useState(false);
const [refreshing, setRefreshing] = useState(false);
const [stats, setStats] = useState(null); // { rate, capWei, raisedWei, token{...} }
const [ethAmount, setEthAmount] = useState("0.001");
const [txStatus, setTxStatus] = useState("");
const [errMsg, setErrMsg] = useState("");
const [lastUpdated, setLastUpdated] = useState(null);

async function onConnect() {
  setErrMsg("");
  setConnecting(true);
  try {
    const { account } = await connectWallet();
    setAccount(account);
  } catch (e) {
    setErrMsg(e?.message || "Failed to connect");
  } finally {
    setConnecting(false);
  }
}

async function onRefresh() {
  setErrMsg("");
  setRefreshing(true);
  try {
    console.log("Refreshing…");
    const data = await readCrowdsaleStats();
    setStats(data);
    setLastUpdated(new Date());
  } catch (e) {
    console.error("Refresh error:", e);
    setErrMsg(e?.message || "Refresh failed");
  } finally {
    setRefreshing(false);
  }
}

async function onBuy() {
  setErrMsg("");
  setTxStatus("Sending…");
  try {
    const receipt = await buyTokensETH({ ethAmount, beneficiary: account });
    setTxStatus(`Mined in block ${receipt.blockNumber}`);
    await onRefresh();
  } catch (e) {
    setTxStatus("");
    setErrMsg(e?.reason || e?.message || "Transaction failed");
  }
}

useEffect(() => {
  // auto-refresh once on load
  onRefresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

const fmt = useMemo(() => {
  if (!stats) return null;
  const eth = (wei) => (Number(wei) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 6 });
  return {
    rate: stats.rate.toString(),
    capEth: eth(stats.capWei),
    raisedEth: eth(stats.raisedWei),
    token: stats.token,
  };
}, [stats]);

return (
  <div className="min-h-screen bg-gray-50 text-gray-900">
    {/* Header (clean — no tagline) */}
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Proofmint Crowdsale</h1>
        <div className="flex gap-2">
          <button onClick={onRefresh} disabled={refreshing} className="px-3 py-1.5 rounded-2xl border shadow-sm hover:shadow disabled:opacity-60">
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button onClick={onConnect} disabled={connecting} className="px-3 py-1.5 rounded-2xl bg-black text-white hover:opacity-90 disabled:opacity-60">
            {account ? shorten(account) : connecting ? "Connecting…" : "Connect Wallet"}
          </button>
        </div>
      </div>
    </header>

<main className="max-w-3xl mx-auto px-4 py-6">
  {/* Chain helper */}
  <div className="mb-4">
    <button onClick={switchToSepolia} className="text-sm underline">Switch to Sepolia</button>
  </div>


{/* Sale Overview (live) */}
<section className="bg-white rounded-2xl shadow p-5 mb-6">
  <h2 className="text-lg font-semibold mb-1">Sale Overview</h2>
  {lastUpdated && (
    <div className="text-xs text-gray-500 mb-2">
        Last updated: {lastUpdated.toLocaleTimeString([], {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })}
    </div>
  )}
  {fmt ? (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="text-sm text-gray-500">Rate (tokens / ETH)</div>
        <div className="text-base font-medium">{fmt.rate}</div>
      </div>
      <div>
        <div className="text-sm text-gray-500">Cap (ETH)</div>
        <div className="text-base font-medium">{fmt.capEth}</div>
      </div>
      <div>
        <div className="text-sm text-gray-500">Raised (ETH)</div>
        <div className="text-base font-medium">{fmt.raisedEth}</div>
      </div>
      <div>
        <div className="text-sm text-gray-500">Token</div>
        <div className="text-base font-medium">{stats.token.name} ({stats.token.symbol})</div>
      <div className="text-xs text-gray-500 break-all">{stats.token.address}</div>
      </div>
    </div>
  ) : (
    <div className="text-sm text-gray-500">Click Refresh to load live stats.</div>
  )}
</section>


{/* Buy Tokens */}
<section className="bg-white rounded-2xl shadow p-5 mb-6">
  <h2 className="text-lg font-semibold mb-3">Buy Tokens</h2>
  <div className="flex items-end gap-3">
    <label className="flex-1">
      <div className="text-sm text-gray-600 mb-1">Amount (ETH)</div>
      <input value={ethAmount} onChange={e => setEthAmount(e.target.value)} type="number" min="0" step="0.0001" className="w-full border rounded-xl px-3 py-2" />
    </label>
    <button onClick={onBuy} disabled={!account} className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50">
      {account ? "Buy" : "Connect first"}
    </button>
  </div>
  {txStatus && <div className="mt-2 text-sm text-green-600">{txStatus}</div>}
</section>


{/*
=============================================================
NFT Section (hidden until wiring is ready)
<section className="bg-white rounded-2xl shadow p-5 mb-6">
<h2 className="text-lg font-semibold mb-3">Receipt NFT (optional)</h2>
<p className="text-sm text-gray-600">Coming soon.</p>
</section>
=============================================================
*/}


{/*
=============================================================
Footer tip (hidden for now)
<footer className="text-center text-xs text-gray-500 py-8">Tip: …</footer>
=============================================================
*/}


        {errMsg && (
          <div className="mt-4 text-sm text-red-600">{errMsg}</div>
        )}
      </main>
    </div>
  );
}
