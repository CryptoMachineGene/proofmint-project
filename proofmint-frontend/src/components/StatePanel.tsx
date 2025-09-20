// src/components/StatePanel.tsx
import React, { useState, useEffect } from "react";
import { fetchSaleState } from "../lib/eth";

type SaleState = {
  rate?: string | null;
  capEth?: string | null;
  raisedEth?: string | null;   // lifetime
  balanceEth?: string | null;  // current
};

const fmt = (v?: string | null, d = "—") => {
  if (v === undefined || v === null || v === "") return d;
  const n = Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: 6 })
    : d;
};

export default function StatePanel({ autoRefreshMs = 25_000 }: { autoRefreshMs?: number }) {
  const [sale, setSale] = useState<SaleState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRefresh() {
    setLoading(true);
    setError(null);
    try {
      const s = await fetchSaleState();
      setSale(s);
    } catch (e: any) {
      console.error("refresh error:", e);
      setError(e?.message ?? "Failed to fetch sale state");
    } finally {
      setLoading(false);
    }
  }

  // initial fetch
  useEffect(() => {
    handleRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // optional auto-refresh while the app is open
  useEffect(() => {
    const id = setInterval(() => {
      // don’t stack if a fetch is in flight
      if (!loading) handleRefresh();
    }, autoRefreshMs);
    return () => clearInterval(id);
  }, [autoRefreshMs, loading]);

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

      {loading && !sale ? (
        <div>Loading…</div>
      ) : sale ? (
        <ul className="space-y-1">
          <li>Rate: {fmt(sale.rate)} tokens per ETH</li>
          <li>Cap: {fmt(sale.capEth)} ETH</li>
          <li>Raised (lifetime): {fmt(sale.raisedEth)} ETH</li>
          <li>Balance (current): {fmt(sale.balanceEth)} ETH</li>
        </ul>
      ) : (
        <div>No data yet.</div>
      )}
    </section>
  );
}
