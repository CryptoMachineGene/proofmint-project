import { useState } from "react";
import type { Signer } from "ethers";
import ConnectButtons from "./components/ConnectButtons";
import BuyForm from "./components/BuyForm";
import StatePanel from "./components/StatePanel";

export default function App() {
  const [signer, setSigner] = useState<Signer | null>(null);
  const [who, setWho] = useState<string>("");
  const [via, setVia] = useState<"Injected" | "WalletConnect" | null>(null);
  const [tick, setTick] = useState(0); // bump to remount StatePanel

  async function onConnected(s: Signer, label: "Injected" | "WalletConnect") {
    setSigner(s);
    setVia(label);
    setWho(await s.getAddress());
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Proofmint</h1>
        {who ? (
          <p className="text-sm text-gray-600 break-all">Connected ({via}): <span className="font-mono">{who}</span></p>
        ) : <p className="text-sm text-gray-600">Not connected</p>}
      </header>

      <ConnectButtons onConnected={onConnected} />
      <BuyForm signer={signer} onPurchased={() => setTick(t => t + 1)} />
      <StatePanel key={tick} />
      <footer style={{ marginTop: "2rem", fontSize: "0.9em", color: "#666" }}>
        🚀 Proofmint frontend running — dev build active
      </footer>

    </main>
  );
}
