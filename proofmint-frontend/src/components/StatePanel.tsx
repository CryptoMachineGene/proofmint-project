import { useEffect, useState } from "react";
import { readState } from "../lib/eth";
import { formatEther } from "ethers";
import Toast from "./ui/Toast";

type View = { rate: string; cap: string; weiRaised: string; nftsMinted: string; capRemainingWei: string; };

export default function StatePanel() {
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<View | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const Spinner = () => <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin align-[-2px] mr-2" />;

  async function refresh() {
    setBusy(true);
    try {
      const s = await readState();
      setState(s);
      setToast({ kind: "success", text: "State refreshed" });
    } catch (e: any) {
      setToast({ kind: "error", text: e?.message ?? String(e) });
    } finally { setBusy(false); }
  }
  useEffect(() => { refresh(); }, []);

  return (
    <section className="bg-white rounded-2xl shadow p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Sale State</h2>
        <button onClick={refresh} disabled={busy} className="px-3 py-1.5 rounded-xl border shadow disabled:opacity-50">
          {busy && <Spinner />}Refresh
        </button>
      </div>
      {state ? (
        <ul className="text-sm space-y-1">
          <li><span className="font-medium">Tokens per ETH (rate):</span> {state.rate}</li>
          <li>
            <span className="font-medium">Cap remaining (ETH):</span>{" "}
            {state.capRemainingWei !== "N/A" ? formatEther(state.capRemainingWei) : "N/A"}
          </li>
          <li><span className="font-medium">Total NFTs minted:</span> {state.nftsMinted}</li>
        </ul>
      ) : <p className="text-sm text-gray-600">No data yet.</p>}
      {toast && <Toast kind={toast.kind} text={toast.text} onClose={() => setToast(null)} />}
    </section>
  );
}
