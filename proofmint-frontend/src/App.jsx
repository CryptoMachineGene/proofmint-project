import React, { useEffect, useMemo, useState, useCallback } from "react";
import { ethers } from "ethers";

/**
 * Proofmint Crowdsale — Single-file demo (merged)
 * - Uses Vite env vars for addresses (no backend env changes)
 * - Real Refresh via a tick state
 * - Proper connect + wallet event reactions (no page reload)
 */

// ====== 🔧 CONFIG (via frontend env)
const NETWORK = (import.meta.env.VITE_NETWORK_NAME || "sepolia").toLowerCase();
const CROWDSALE_ADDRESS = import.meta.env.VITE_CROWDSALE_ADDRESS; // required
const PROOFNFT_ADDRESS   = import.meta.env.VITE_PROOFNFT_ADDRESS; // optional

const SEPOLIA_CHAIN_ID = 11155111;

// Minimal ABI fragments — replace with your exact ABIs if names differ
const CROWDSALE_ABI = [
  // Reads
  "function rate() view returns (uint256)",
  "function cap() view returns (uint256)",
  "function weiRaised() view returns (uint256)",
  "function token() view returns (address)",
  // Common buy function (OpenZeppelin style)
  "function buyTokens(address beneficiary) payable",
];

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
];

// Small helpers
function getProvider() {
  if (window.ethereum) return new ethers.BrowserProvider(window.ethereum);
  const rpc = import.meta.env.VITE_FALLBACK_RPC;
  if (rpc) return new ethers.JsonRpcProvider(rpc); // read-only
  throw new Error("No injected wallet (MetaMask) found");
}

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [status, setStatus] = useState("");

  const [rate, setRate] = useState(null);
  const [cap, setCap] = useState(null);
  const [raised, setRaised] = useState(null);
  const [tokenAddr, setTokenAddr] = useState(null);
  const [tokenMeta, setTokenMeta] = useState({ name: "", symbol: "", decimals: 18 });

  // NEW: tick to force refreshes
  const [refreshTick, setRefreshTick] = useState(0);

  // Init provider + initial chain
  useEffect(() => {
    if (!window?.ethereum) return;
    const _provider = getProvider();
    setProvider(_provider);

    (async () => {
      try {
        const net = await _provider.getNetwork();
        setChainId(Number(net.chainId));
      } catch (e) {
        console.error(e);
      }
    })();

    // listen to wallet events
    const onChainChanged = async () => {
      try {
        const net = await _provider.getNetwork();
        setChainId(Number(net.chainId));
        setRefreshTick((t) => t + 1);
      } catch {}
    };
    const onAccountsChanged = (accs) => {
      setAccount(accs?.[0] || null);
      setSigner(null);
      setRefreshTick((t) => t + 1);
    };

    window.ethereum.on?.("chainChanged", onChainChanged);
    window.ethereum.on?.("accountsChanged", onAccountsChanged);
    return () => {
      window.ethereum.removeListener?.("chainChanged", onChainChanged);
      window.ethereum.removeListener?.("accountsChanged", onAccountsChanged);
    };
  }, []);

  // Contracts (recreated when provider/chain changes)
  const crowdsale = useMemo(() => {
    if (!provider || !CROWDSALE_ADDRESS) return null;
    return new ethers.Contract(CROWDSALE_ADDRESS, CROWDSALE_ABI, provider);
  }, [provider, CROWDSALE_ADDRESS, chainId]);

  const token = useMemo(() => {
    if (!provider || !tokenAddr) return null;
    return new ethers.Contract(tokenAddr, ERC20_ABI, provider);
  }, [provider, tokenAddr]);

  // Connect wallet
  const connect = useCallback(async () => {
    if (!provider) return alert("No wallet found. Install MetaMask.");
    try {
      const accs = await provider.send("eth_requestAccounts", []);
      const addr = accs[0];
      setAccount(addr);
      const _signer = await provider.getSigner();
      setSigner(_signer);
      const net = await provider.getNetwork();
      setChainId(Number(net.chainId));
      setStatus("");
    } catch (e) {
      console.error(e);
      setStatus(e.message || "Failed to connect wallet");
    }
  }, [provider]);

  // Read crowdsale (called on mount, chain/account changes, and Refresh)
  const readCrowdsale = useCallback(async () => {
    if (!crowdsale) return;
    setStatus("Reading crowdsale…");
    try {
      const [r, c, w, t] = await Promise.all([
        crowdsale.rate().catch(() => null),
        crowdsale.cap().catch(() => null),
        crowdsale.weiRaised().catch(() => null),
        crowdsale.token().catch(() => null),
      ]);
      if (r !== null) setRate(Number(r));
      if (c !== null) setCap(ethers.formatEther(c));
      if (w !== null) setRaised(ethers.formatEther(w));
      setTokenAddr(t || null);
      setStatus("");
    } catch (e) {
      console.error(e);
      setStatus("Failed to read crowdsale.");
    }
  }, [crowdsale]);

  // Read token meta whenever tokenAddr changes or on refresh
  const readTokenMeta = useCallback(async () => {
    if (!token) return;
    try {
      const [name, symbol, decimals] = await Promise.all([
        token.name().catch(() => ""),
        token.symbol().catch(() => ""),
        token.decimals().catch(() => 18),
      ]);
      setTokenMeta({ name, symbol, decimals });
    } catch {
      // ignore token meta failures
    }
  }, [token]);

  // Auto-reads on mount / changes / refresh
  useEffect(() => {
    readCrowdsale();
  }, [readCrowdsale, refreshTick, chainId]);

  useEffect(() => {
    readTokenMeta();
  }, [readTokenMeta, refreshTick, tokenAddr]);

  // Buy tokens
  async function handleBuy(e) {
    e.preventDefault();
    if (!signer || !provider) return alert("Connect wallet first.");
    if (NETWORK === "sepolia" && chainId !== SEPOLIA_CHAIN_ID) {
      return alert("Please switch to Sepolia (11155111).");
    }

    const formData = new FormData(e.currentTarget);
    const ethAmount = formData.get("ethAmount");
    if (!ethAmount || Number(ethAmount) <= 0) return alert("Enter a valid amount.");

    setStatus("Submitting transaction…");
    try {
      const saleWithSigner = crowdsale.connect(signer);
      const value = ethers.parseEther(String(ethAmount));

      // Try buyTokens(beneficiary) first; fallback to raw payable send
      let tx;
      try {
        const beneficiary = await signer.getAddress();
        tx = await saleWithSigner.buyTokens(beneficiary, { value });
      } catch {
        tx = await signer.sendTransaction({ to: CROWDSALE_ADDRESS, value });
      }

      const receipt = await tx.wait();
      setStatus(`Success: ${receipt.hash}`);
      setRefreshTick((t) => t + 1);
    } catch (e) {
      console.error(e);
      setStatus(e.shortMessage || e.reason || e.message || "Transaction failed");
    }
  }

  const showWrongNet =
    NETWORK === "sepolia" && chainId && chainId !== SEPOLIA_CHAIN_ID;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Proofmint Crowdsale</h1>
            <p className="text-sm text-gray-600">
              Network: <span className="font-semibold capitalize">{NETWORK}</span>
            </p>
          </div>
          <button
            onClick={connect}
            className="px-4 py-2 rounded-2xl shadow bg-black text-white hover:opacity-90 disabled:opacity-60"
          >
            {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Connect Wallet"}
          </button>
        </header>

        {showWrongNet && (
          <div className="bg-yellow-100 border border-yellow-300 text-yellow-900 rounded-xl p-4 mb-4">
            You are on chain {chainId}. Please switch to <strong>Sepolia (11155111)</strong>.
          </div>
        )}

        {status && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 mb-4 break-all">
            {status}
          </div>
        )}

        <Section
          title="Sale Overview"
          right={
            <button
              onClick={() => setRefreshTick((t) => t + 1)}
              className="text-sm underline"
            >
              Refresh
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat label="Rate" value={rate != null ? `${rate} tokens / ETH` : "—"} />
            <Stat label="Cap" value={cap ? `${cap} ETH` : "—"} />
            <Stat label="Raised" value={raised ? `${raised} ETH` : "—"} />
          </div>
          <div className="mt-4 text-sm text-gray-600 space-y-1">
            <div>Token: <span className="font-mono">{tokenAddr || "—"}</span></div>
            {tokenMeta.name && (
              <div>
                Resolved ERC20: <strong>{tokenMeta.name}</strong> ({tokenMeta.symbol})
              </div>
            )}
            <div>Crowdsale: <span className="font-mono">{CROWDSALE_ADDRESS || "—"}</span></div>
            {PROOFNFT_ADDRESS && (
              <div>ProofNFT: <span className="font-mono">{PROOFNFT_ADDRESS}</span></div>
            )}
          </div>
        </Section>

        <Section title="Buy Tokens">
          <form onSubmit={handleBuy} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Amount (ETH)</label>
              <input
                name="ethAmount"
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.01"
                className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <button
              type="submit"
              className="w-full md:w-auto px-6 py-3 rounded-2xl bg-black text-white shadow hover:opacity-90 disabled:opacity-60"
              disabled={!account || showWrongNet || !CROWDSALE_ADDRESS}
            >
              Purchase
            </button>
            {!account && (
              <div className="text-sm text-gray-600">Connect your wallet to continue.</div>
            )}
          </form>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children, right }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 mb-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
