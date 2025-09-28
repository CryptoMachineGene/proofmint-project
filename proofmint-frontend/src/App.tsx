import { useEffect, useState } from "react";
import ConnectButtons from "./components/ConnectButtons";
import StatePanel from "./components/StatePanel";
import BuyForm from "./components/BuyForm";
import Withdraw from "./components/Withdraw";
import type { WalletState } from "./lib/eth";
import { BrowserProvider, Signer } from "ethers";

export default function App() {
  const [wallet, setWallet] = useState<WalletState>({
    account: null,
    chainId: null,          // hex string per WalletState
    provider: null,
  });

  // a simple "poke" to tell StatePanel to refresh after buy/withdraw
  const [refreshTick, setRefreshTick] = useState(0);
  const bump = () => setRefreshTick(t => t + 1);

  // adapt ConnectButtons' (signer, chainId:number) to our WalletState
  const onConnected = async (signer: Signer, chainNum: number) => {
    const account = await signer.getAddress();
    const chainIdHex = "0x" + Number(chainNum).toString(16);
    const provider = new BrowserProvider((window as any).ethereum);
    setWallet({ account, chainId: chainIdHex, provider });
  };

  // optional: hydrate if already connected via window.ethereum
  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    (async () => {
      try {
        const [accounts, chainId] = await Promise.all([
          eth.request({ method: "eth_accounts" }),
          eth.request({ method: "eth_chainId" }),
        ]);
        setWallet(w => ({
          ...w,
          account: accounts?.[0] ?? null,
          chainId: chainId ?? null, // already hex
          provider: accounts?.[0] ? new BrowserProvider(eth) : w.provider,
        }));
      } catch {}
    })();
  }, []);

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proofmint Demo</h1>
        <ConnectButtons onConnected={onConnected} />
      </header>

      {/* pass provider/account + refresh signal so we can show userToken */}
      <StatePanel
        provider={wallet.provider}
        account={wallet.account}
        refreshSignal={refreshTick}
      />

      {/* Actions */}
      <BuyForm provider={wallet.provider} onPurchased={bump} />
      <Withdraw provider={wallet.provider} onWithdrew={bump} />

      <footer className="text-xs text-gray-500 pt-4"></footer>
    </main>
  );
}
