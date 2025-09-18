// src/App.tsx
import { useState } from "react";
import type { Signer } from "ethers";
import { CHAIN_ID } from "./env";
import ConnectButtons from "./components/ConnectButtons";
import BuyForm from "./components/BuyForm";
import StatePanel from "./components/StatePanel";

export default function App() {
  const [signer, setSigner] = useState<Signer | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <section className="bg-white rounded-2xl shadow p-5 mb-6">
        <h1 className="text-xl font-semibold mb-3">Proofmint Demo</h1>
        <ConnectButtons
          onConnected={(s, detected) => { setSigner(s); setChainId(detected); }}
          onDisconnected={() => { setSigner(null); setChainId(null); }}
        />
      </section>

      {!signer ? (
        <section className="bg-white rounded-2xl shadow p-5 mb-6">
          <p className="text-sm">Connect a wallet to continue.</p>
        </section>
      ) : chainId !== CHAIN_ID ? (
        <section className="bg-white rounded-2xl shadow p-5 mb-6">
          <p className="text-sm">Switch your wallet to chainId <b>{CHAIN_ID}</b>.</p>
        </section>
      ) : (
        <>
          <section className="bg-white rounded-2xl shadow p-5 mb-6">
            <h2 className="text-lg font-semibold mb-3">Buy Tokens</h2>
            <BuyForm signer={signer} />
          </section>

          <section className="bg-white rounded-2xl shadow p-5 mb-6">
            <h2 className="text-lg font-semibold mb-3">Sale State</h2>
            <StatePanel signer={signer} tick={tick} onRefresh={() => setTick(t => t + 1)} />
          </section>
        </>
      )}
    </div>
  );
}
