import React from "react";
import { ethers } from "ethers";
import { readState } from "../lib/eth";
import type { FrontendState } from "../lib/eth";

export default function StatePanel() {
  const [state, setState] = React.useState<FrontendState | null>(null);
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

  React.useEffect(() => { void refresh(); }, [refresh]);

  // fallbacks if someone calls readState() from an older build
  const displayRate = (s: FrontendState) =>
    s.rateInt ?? (() => ethers.formatUnits(s.rate, 0))();

  const displayRemainingEth = (s: FrontendState) =>
    s.capRemainingEth ?? (() => ethers.formatEther(s.capRemainingWei))();

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
          <li>Tokens per ETH (rate): {displayRate(state)}</li>
          <li>Cap remaining (ETH): {displayRemainingEth(state)}</li>
          <li>
            Total NFTs minted:{" "}
            {state.nftsMinted === "N/A"
              ? "N/A (not exposed by contract)"
              : state.nftsMinted}
          </li>
        </ul>
      )}
    </section>
  );
}
