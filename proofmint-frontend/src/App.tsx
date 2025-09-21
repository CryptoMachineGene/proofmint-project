// src/App.tsx
import { useEffect, useState } from "react";
import ConnectButtons from "./components/ConnectButtons";
import StatePanel from "./components/StatePanel";
import BuyForm from "./components/BuyForm";
import Withdraw from "./components/Withdraw";
import type { WalletState } from "./lib/eth";

export default function App() {
  const [wallet, setWallet] = useState<WalletState>({
    account: null,
    chainId: null,
    provider: null,
  });

  // optional: hydrate if already connected
  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    (async () => {
      try {
        const [accounts, chainId] = await Promise.all([
          eth.request({ method: "eth_accounts" }),
          eth.request({ method: "eth_chainId" }),
        ]);
        setWallet((w) => ({
          ...w,
          account: accounts?.[0] ?? null,
          chainId: chainId ?? null,
        }));
      } catch {}
    })();
  }, []);

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proofmint Demo</h1>
        <ConnectButtons onConnected={setWallet} />
      </header>

      {/* Sale state (reads via FALLBACK_RPC or wallet) */}
      <StatePanel />

      {/* Actions (need a connected provider) */}
      <BuyForm provider={wallet.provider} onPurchased={() => {/* optional: trigger a refresh elsewhere */}} />
      <Withdraw provider={wallet.provider} onAfterTx={() => {/* optional */}} />

      <footer className="text-xs text-gray-500 pt-4">
        
      </footer>
    </main>
  );
}
