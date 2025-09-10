import React from "react";
import { readState } from "../lib/eth";

export default function StatePanel() {
  const [state, setState] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string>("");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const s = await readState();
      setState(s);
    } catch (e: any) {
      console.error("readState failed:", e);
      setErr(e?.message ?? String(e));
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load once on mount (no timers / no polling)
  React.useEffect(() => { void refresh(); }, [refresh]);

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold mb-2">Sale State</h2>
      <button
        onClick={refresh}
        disabled={loading}
        className="px-3 py-1 bg-gray-200 rounded"
      >
        {loading ? "Loading…" : "Refresh"}
      </button>

      {err && <p className="text-red-600 mt-2">Error: {err}</p>}
      {!state && !err && <p className="mt-2">No data yet.</p>}

      {state && (
        <ul className="mt-2 list-disc pl-5">
          <li>Tokens per ETH (rate): {state.rate}</li>
          <li>Cap remaining (ETH): {(BigInt(state.capRemainingWei) / 10n**18n).toString()}</li>
          <li>Total NFTs minted: {state.nftsMinted}</li>
        </ul>
      )}
    </section>
  );
}
