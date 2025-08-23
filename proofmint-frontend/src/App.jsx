import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

/**
 * PROOFMINT – Minimal Frontend dApp
 * ---------------------------------
 * What this gives you out of the box:
 * - Wallet connect (MetaMask or any EIP-1193 provider)
 * - Sepolia network check + helpful errors
 * - Read crowdsale state: rate, cap, raised, token, nft
 * - Buy flow: user enters ETH => tx to crowdsale (auto-uses `buyTokens(address)` if available, else simple payable send)
 * - Clean Tailwind UI ready for Vercel/Netlify
 *
 * QUICK START
 * 1) npm i react react-dom ethers
 * 2) Put your addresses in the ADDRESSES object below
 * 3) Replace ABI fragments with the ones from your artifacts if signatures differ
 * 4) Mount <App /> in your index.jsx and run: npm run dev (or your favorite dev server)
 *
 * NOTE: This file is self-contained for demo speed. In a real repo,
 * split components and move ABIs to /src/abi/*.json.
 */

// ====== 🔧 CONFIG ======
const ADDRESSES = {
  sepolia: {
    crowdsale: "0xD055853f6F1fcF9CB562eDd634aDB87835300261", // <— example from your logs; replace if needed
    token: "0x9712820E18e5f2B8cBe3da25f31b8f2F8c8576bF", // optional: read from contract if exposed
    proofNft: "0xa8750E228B20d1BC302d0Acdd8101d643E04E323", // optional: read from contract if exposed
  },
};

// Minimal ABI fragments — replace with your exact ABIs if names differ
const CROWDSALE_ABI = [
  // Reads
  "function rate() view returns (uint256)",
  "function cap() view returns (uint256)",
  "function weiRaised() view returns (uint256)",
  "function token() view returns (address)",
  // Common buy function (OpenZeppelin style)
  "function buyTokens(address beneficiary) payable",
  // Optional getters (ignore if your contract doesn't have these)
  "function wallet() view returns (address)",
];

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
];

const ERC721_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  // If you added a receipt getter, add here, e.g. tokensOfOwner(address)
];

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

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [status, setStatus] = useState("");

  const [rate, setRate] = useState(null);
  const [cap, setCap] = useState(null);
  const [raised, setRaised] = useState(null);
  const [tokenAddr, setTokenAddr] = useState(ADDRESSES.sepolia.token || null);
  const [tokenMeta, setTokenMeta] = useState({ name: "", symbol: "", decimals: 18 });

  const crowdsale = useMemo(() => {
    if (!provider || !chainId) return null;
    if (chainId !== 11155111) return null; // Sepolia
    return new ethers.Contract(ADDRESSES.sepolia.crowdsale, CROWDSALE_ABI, provider);
  }, [provider, chainId]);

  const token = useMemo(() => {
    if (!provider || !tokenAddr) return null;
    return new ethers.Contract(tokenAddr, ERC20_ABI, provider);
  }, [provider, tokenAddr]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.ethereum) return;

    const _provider = new ethers.BrowserProvider(window.ethereum);
    setProvider(_provider);

    (async () => {
      try {
        const net = await _provider.getNetwork();
        setChainId(Number(net.chainId));
        // Listen for chain/account changes
        window.ethereum.on("chainChanged", () => window.location.reload());
        window.ethereum.on("accountsChanged", (accs) => {
          setAccount(accs[0] || null);
        });
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  async function connect() {
    if (!provider) return alert("No wallet found. Install MetaMask.");
    try {
      const accs = await provider.send("eth_requestAccounts", []);
      setAccount(accs[0]);
      const _signer = await provider.getSigner();
      setSigner(_signer);
      const net = await provider.getNetwork();
      setChainId(Number(net.chainId));
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  }

  async function readCrowdsale() {
    if (!crowdsale) return;
    setStatus("Reading crowdsale…");
    try {
      const [r, c, w, t] = await Promise.all([
        crowdsale.rate().catch(() => null),
        crowdsale.cap().catch(() => null),
        crowdsale.weiRaised().catch(() => null),
        crowdsale.token().catch(() => null),
      ]);
      if (r) setRate(Number(r));
      if (c) setCap(ethers.formatEther(c));
      if (w) setRaised(ethers.formatEther(w));
      if (t) setTokenAddr(t);
      setStatus("");
    } catch (e) {
      console.error(e);
      setStatus("Failed to read crowdsale.");
    }
  }

  useEffect(() => {
    if (crowdsale) readCrowdsale();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crowdsale]);

  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        const [name, symbol, decimals] = await Promise.all([
          token.name().catch(() => ""),
          token.symbol().catch(() => ""),
          token.decimals().catch(() => 18),
        ]);
        setTokenMeta({ name, symbol, decimals });
      } catch (e) {
        // ignore
      }
    })();
  }, [token]);

  async function handleBuy(e) {
    e.preventDefault();
    if (!signer || !provider) return alert("Connect wallet first.");
    if (chainId !== 11155111) return alert("Please switch to Sepolia.");

    const formData = new FormData(e.currentTarget);
    const ethAmount = formData.get("ethAmount");
    if (!ethAmount || Number(ethAmount) <= 0) return alert("Enter a valid amount.");

    setStatus("Submitting transaction…");
    try {
      const saleWithSigner = crowdsale.connect(signer);
      const value = ethers.parseEther(String(ethAmount));

      // Try buyTokens(beneficiary) first; fall back to raw send if not present
      let tx;
      try {
        const beneficiary = await signer.getAddress();
        tx = await saleWithSigner.buyTokens(beneficiary, { value });
      } catch (_) {
        tx = await signer.sendTransaction({ to: ADDRESSES.sepolia.crowdsale, value });
      }

      const receipt = await tx.wait();
      setStatus(`Success: ${receipt.hash}`);
      await readCrowdsale();
    } catch (e) {
      console.error(e);
      setStatus(e.shortMessage || e.reason || e.message || "Transaction failed");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Proofmint Crowdsale</h1>
            <p className="text-sm text-gray-600"></p>
          </div>
          <button
            // onClick={connect}
            disabled
            className="px-4 py-2 rounded-2xl shadow bg-black text-white hover:opacity-90"
          >
            {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Connect Wallet (coming soon)"}
          </button>
        </header>

        {chainId && chainId !== 11155111 && (
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
          right={<button onClick={readCrowdsale} className="text-sm underline">Refresh</button>}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500">Rate</div>
              <div className="text-lg font-semibold">{rate ?? "—"} tokens / ETH</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500">Cap</div>
              <div className="text-lg font-semibold">{cap ? `${cap} ETH` : "—"}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500">Raised</div>
              <div className="text-lg font-semibold">{raised ? `${raised} ETH` : "—"}</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <div>Token: <span className="font-mono">{tokenAddr || "—"}</span></div>
            {tokenMeta.name && (
              <div>
                Resolved ERC20: <strong>{tokenMeta.name}</strong> ({tokenMeta.symbol})
              </div>
            )}
            <div>Crowdsale: <span className="font-mono">{ADDRESSES.sepolia.crowdsale}</span></div>
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
              className="w-full md:w-auto px-6 py-3 rounded-2xl bg-black text-white shadow hover:opacity-90"
              disabled={!account || chainId !== 11155111}
            >
              Purchase
            </button>
            {!account && (
              <div className="text-sm text-gray-600">Connect your wallet to continue.</div>
            )}
          </form>
        </Section>

        {/* <Section title="Receipt NFT (optional)">
          <p className="text-sm text-gray-600">
            If your flow mints a <span className="font-semibold">ProofNFT</span> as a receipt, you can add a
            viewer here later (e.g., list owned token IDs). This UI is scaffolded to keep focus on the main sale.
          </p>
        </Section>

        <footer className="mt-8 text-xs text-gray-500">
          <p>Tip: Replace ABI fragments with your exact compiled ABIs for 1:1 compatibility.</p>
        </footer> */}
      </div>
    </div>
  );
}
