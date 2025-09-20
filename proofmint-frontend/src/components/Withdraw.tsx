import { useEffect, useState } from "react";
import type { BrowserProvider } from "ethers";
import { Contract } from "ethers";
import { withdrawRaised } from "../lib/eth";
import { CROWDSALE_ADDRESS } from "../config";
import Toast from "./ui/Toast";

const OWNABLE_ABI = ["function owner() view returns (address)"];

export default function Withdraw({ provider }: { provider?: BrowserProvider | null }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!provider) {
          setConnected(false);
          setIsOwner(false);
          return;
        }
        setConnected(true);

        const signer = await provider.getSigner();
        const me = (await signer.getAddress()).toLowerCase();
        const ownable = new Contract(CROWDSALE_ADDRESS, OWNABLE_ABI, provider);
        const owner = (await ownable.owner()).toLowerCase();
        setIsOwner(me === owner);
      } catch {
        setConnected(false);
        setIsOwner(false);
      }
    })();
  }, [provider]);

  // Hide everything if not connected or not owner
  if (!connected || !isOwner) return null;

  const onWithdraw = async () => {
    if (!provider || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const tx = await withdrawRaised(provider);
      setMsg(`Withdrawing… ${tx.hash.slice(0, 10)}…`);
      window.open(`https://sepolia.etherscan.io/tx/${tx.hash}`, "_blank");
      await tx.wait();
      setMsg(`Success: ${tx.hash.slice(0, 10)}…`);
    } catch (e: any) {
      const m = (e?.message || "").toLowerCase();
      if (m.includes("user rejected")) setMsg("Action canceled.");
      else if (m.includes("insufficient funds")) setMsg("Insufficient funds for gas.");
      else setMsg("Withdraw failed. Check owner wallet & Sepolia.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl shadow p-5 space-y-3 bg-white">
      <div className="text-lg font-semibold">Owner Actions</div>
      <div className="flex justify-end">
        <button
          onClick={onWithdraw}
          disabled={busy}
          className="px-4 py-2 rounded-xl border disabled:opacity-60"
        >
          {busy ? "Withdrawing…" : "Withdraw Raised ETH"}
        </button>
      </div>
      {msg && <Toast message={msg} />}
    </section>
  );
}
