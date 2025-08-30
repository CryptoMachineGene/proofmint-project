import { useEffect, useState } from "react";
import ConnectButton from "./components/ConnectButton";
import BuyForm from "./components/BuyForm";
import StatePanel from "./components/StatePanel";
import WithdrawButton from "./components/WithdrawButton"; // optional
import { readDashboard, usingFallbackRPC } from "./lib/eth";
import "./App.css";

interface Dash {
  rate: string;
  capEth: string;
  raisedEth: string;
  nftsMinted: string;
}

export default function App() {
  const [connected, setConnected] = useState<boolean>(false);
  const [dash, setDash] = useState<Dash | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const d = await readDashboard();
      setDash(d);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            Proofmint{" "}
            <span className="text-xs font-normal text-gray-500 align-middle">
              {usingFallbackRPC() ? "Read-only via RPC" : "Wallet-connected"}
            </span>
          </h1>
          <ConnectButton onConnected={() => setConnected(true)} />
        </header>

        <StatePanel data={dash} onRefresh={refresh} refreshing={refreshing} />
        <BuyForm disabled={!connected} rate={dash?.rate} />

        {/* Owner section is optional, handy for demo */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-lg font-semibold mb-3">Owner Actions</h2>
          <WithdrawButton />
        </div>
      </div>
    </div>
  );
}
