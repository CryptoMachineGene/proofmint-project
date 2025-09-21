import React, { useState, useEffect } from "react";
import type { BrowserProvider } from "ethers";
import { fetchSaleState } from "../lib/eth";
import { shortAddr } from "../lib/ui";

type SaleState = {
  rate?: string | null;
  capEth?: string | null;
  raisedEth?: string | null;   // lifetime
  balanceEth?: string | null;  // current
  tokenSym?: string | null;
  userToken?: string | null;
};

<<<<<<< HEAD
=======
// zero-safe formatter
>>>>>>> origin/main
const fmt = (v: string | number | null | undefined, d = "—") => {
  if (v === null || v === undefined) return d;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: 6 })
    : d;
};

export default function StatePanel({
  provider,
  account,
  autoRefreshMs = 25_000,
<<<<<<< HEAD
  refreshSignal = 0, // bump from BuyForm / Withdraw
=======
  refreshSignal = 0,
>>>>>>> origin/main
}: {
  provider?: BrowserProvider | null;
  account?: string | null;
  autoRefreshMs?: number;
<<<<<<< HEAD
  refreshSignal?: number;
=======
  refreshSignal?: number; // ⬅️ add this
>>>>>>> origin/main
}) {
  const [sale, setSale] = useState<SaleState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRefresh() {
    setLoading(true);
    setError(null);
    try {
      const s = await fetchSaleState(provider ?? undefined, account ?? undefined);
      setSale(s);
    } catch (e: any) {
      setError(e?.message ?? "Failed to fetch sale state");
    } finally {
      setLoading(false);
    }
  }

<<<<<<< HEAD
  // first fetch
  useEffect(() => { handleRefresh(); }, []);

  // poke refresh when BuyForm or Withdraw calls back
  useEffect(() => { handleRefresh(); }, [refreshSignal]);

  // silent auto-refresh
=======
  // initial fetch
  useEffect(() => { handleRefresh(); }, []);

  // refresh when parent “pokes” us (after buy/withdraw)
  useEffect(() => { handleRefresh(); }, [refreshSignal]);

  // silent auto-refresh (no spinner flicker)
>>>>>>> origin/main
  useEffect(() => {
    const interval = Math.max(5_000, Number(autoRefreshMs) || 0);
    if (!interval) return;
    const id = setInterval(() => {
      fetchSaleState(provider ?? undefined, account ?? undefined)
        .then((s) => setSale(s))
        .catch(() => {});
    }, interval);
    return () => clearInterval(id);
  }, [autoRefreshMs, provider, account]);

  return (
    <section className="bg-white rounded-2xl shadow p-5 mb-6">
      <h2 className="text-lg font-semibold mb-3">Sale State</h2>

      <button
        onClick={handleRefresh}
        className="px-3 py-1 rounded-xl border mb-3 disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Refreshing…" : "Refresh"}
      </button>

      {error && <div className="text-red-500 mb-2">{error}</div>}

      {sale ? (
        <ul className="space-y-1">
          <li>
            Rate: {fmt(sale.rate)}
            {sale.tokenSym ? ` ${sale.tokenSym}` : ""} per ETH
          </li>
<<<<<<< HEAD
          {sale.userToken != null && sale.tokenSym ? (
            <li>My balance: {fmt(sale.userToken)} {sale.tokenSym}</li>
          ) : null}
=======

          {/* user's token balance */}
          {sale.userToken != null && sale.tokenSym ? (
            <li>My balance: {fmt(sale.userToken)} {sale.tokenSym}</li>
          ) : null}

>>>>>>> origin/main
          <li>Cap: {fmt(sale.capEth)} ETH</li>
          <li>Raised (lifetime): {fmt(sale.raisedEth)} ETH</li>
          <li>Balance (current): {fmt(sale.balanceEth)} ETH</li>
        </ul>
      ) : (
        <div>{loading ? "Loading…" : "No data yet."}</div>
      )}
    </section>
  );
}
