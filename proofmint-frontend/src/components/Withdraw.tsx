import { useState } from "react";
import type { BrowserProvider } from "ethers";
import { withdrawRaised } from "../lib/eth";

type Props = {
  provider?: BrowserProvider | null;
  onAfterTx?: () => void | Promise<void>;
};

export default function Withdraw({ provider, onAfterTx }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setMsg(null);
    try {
      if (!provider) throw new Error("Connect a wallet first.");
      const receipt = await withdrawRaised(provider);
      setMsg(`✅ Withdrawn. Tx ${String((receipt as any)?.hash ?? "").slice(0,10)}…`);
      await onAfterTx?.();
    } catch (e: any) {
      setMsg(`❌ ${e?.shortMessage ?? e?.message ?? "Withdraw failed"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-lg font-semibold mb-3">Owner Withdraw</h2>
      <button
        onClick={onClick}
        disabled={!provider || busy}
        className="px-4 py-2 rounded-xl shadow border disabled:opacity-50"
      >
        {busy ? "Withdrawing…" : "Withdraw Raised ETH"}
      </button>
      {msg && <p className="text-sm mt-3">{msg}</p>}
    </section>
  );
}
