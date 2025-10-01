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
  onDisconnect,       // <<< NEW: optional, to clear signer/account in parent
}: {
  provider?: BrowserProvider | null;
  account?: string | null;
  autoRefreshMs?: number;
  refreshSignal?: number;
  onDisconnect?: () => void;   // <<< NEW
}) {
  const [sale, setSale] = useState<SaleState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const short = (addr?: string | null) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

  const copyAddr = async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  return (
    <section className="bg-white rounded-2xl shadow p-5 mb-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold">Sale State</h2>

        {/* Subtle account badge with Copy + Disconnect */}
        {account ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 rounded-lg bg-gray-100 font-mono">
              {short(account)}
            </span>
            <button
              onClick={copyAddr}
              className="px-2 py-1 rounded-lg border text-gray-700 hover:bg-gray-50"
              title="Copy address"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            {onDisconnect && (
              <button
                onClick={onDisconnect}
                className="px-2 py-1 rounded-lg border text-gray-700 hover:bg-gray-50"
                title="Disconnect (clears dApp state)"
              >
                Disconnect
              </button>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-500">No wallet connected.</span>
        )}
      </div>

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
