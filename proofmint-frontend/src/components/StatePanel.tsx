import React, { useState, useEffect } from "react";
import type { BrowserProvider } from "ethers";
import { fetchSaleState } from "../lib/eth";

type SaleState = {
  rate?: string | null;
  capEth?: string | null;
  raisedEth?: string | null;   // lifetime
  balanceEth?: string | null;  // current
  tokenSym?: string | null;
  userToken?: string | null;
};

// zero-safe formatter
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
  refreshSignal = 0, // bump from BuyForm / Withdraw
}: {
  provider?: BrowserProvider | null;
  account?: string | null;
  autoRefreshMs?: number;
  refreshSignal?: number;
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

  // first fetch
  useEffect(() => { handleRefresh(); }, []);

  // poke refresh when BuyForm or Withdraw calls back
  useEffect(() => { handleRefresh(); }, [refreshSignal]);

  // silent auto-refresh
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

          {sale.userToken != null && sale.tokenSym ? (
            <li>My balance: {fmt(sale.userToken)} {sale.tokenSym}</li>
          ) : null}

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
