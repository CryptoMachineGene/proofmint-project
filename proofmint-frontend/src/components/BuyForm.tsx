import { useState } from "react";
import type { Signer } from "ethers";
import { buyTokensSmart } from "../lib/eth";
import Toast from "./ui/Toast";

type Props = { signer?: Signer | null; onPurchased?: () => void };

export default function BuyForm({ signer, onPurchased }: Props) {
  const [ethAmount, setEthAmount] = useState<string>("0.01");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const Spinner = () => (
    <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin align-[-2px] mr-2" />
  );

  async function onBuy() {
    setBusy(true);
    try {
      if (!signer) throw new Error("Connect a wallet first.");
      if (!ethAmount || Number(ethAmount) <= 0) throw new Error("Enter a positive amount.");

      // send tx and wait for confirmation
      const receipt = await buyTokensSmart(ethAmount, signer);
      const hash = (receipt as any)?.hash ?? (receipt as any)?.transactionHash ?? "";
      setToast({ kind: "success", text: `Success! Tx ${String(hash).slice(0, 10)}…` });

      // ask parent to refresh sale state
      onPurchased?.();
    } catch (e: any) {
      const msg =
        e?.shortMessage ||
        e?.info?.error?.message ||
        e?.cause?.reason ||
        e?.message ||
        String(e);
      // common helpful hints
      if (/chain|network/i.test(msg)) {
        setToast({ kind: "error", text: "Wrong network. Switch wallet to Sepolia and try again." });
      } else if (/insufficient funds/i.test(msg)) {
        setToast({ kind: "error", text: "Insufficient funds for value + gas." });
      } else {
        setToast({ kind: "error", text: msg });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white rounded-2xl shadow p-5 mb-6">
      <h2 className="text-lg font-semibold mb-3">Buy Tokens</h2>
      <div className="flex items-end gap-3">
        <label className="flex-1">
          <div className="text-sm text-gray-600 mb-1">Amount (ETH)</div>
          <input
            value={ethAmount}
            onChange={(e) => setEthAmount(e.target.value.replace(",", "."))}
            type="number"
            min="0"
            step="0.0001"
            placeholder="0.001"
            className="w-full border rounded-xl px-3 py-2"
          />
        </label>
        <button onClick={onBuy} disabled={busy || !signer} className="px-4 py-2 rounded-xl shadow border disabled:opacity-50">
          {busy && <Spinner />}Buy
        </button>
      </div>
      {!signer && <p className="text-sm text-gray-500 mt-2">Connect a wallet to enable buying.</p>}
      {toast && <Toast kind={toast.kind} text={toast.text} onClose={() => setToast(null)} />}
    </section>
  );
}
