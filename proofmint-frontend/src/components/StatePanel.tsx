import React, { useState, useEffect } from "react";
import { fetchSaleState } from "../lib/eth";

type SaleState = {
  rate: string;
  capEth: string;
  raisedEth: string;   // lifetime
  balanceEth: string;  // current
};

export default function StatePanel() {
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
      setError(e.message ?? "Failed to fetch sale state");
    } finally {
      setLoading(false);
    }
  }

  // auto-refresh on mount
  useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <section className="bg-white rounded-2xl shadow p-5 mb-6">
      <h2 className="text-lg font-semibold mb-3">Sale State</h2>

      <button
        onClick={handleRefresh}
        className="px-3 py-1 rounded-xl bg-blue-600 text-white mb-3"
        disabled={loading}
      >
        {loading ? "Refreshing..." : "Refresh"}
      </button>

      {error && <div className="text-red-500">{error}</div>}

      {loading ? (
        <div>Loading...</div>
      ) : sale ? (
        <ul className="space-y-1">
          <li>Rate: {Number(sale.rate).toLocaleString()} tokens per ETH</li>
          <li>Cap: {Number(sale.capEth).toLocaleString()} ETH</li>
          <li>Raised (lifetime): {Number(sale.raisedEth).toLocaleString()} ETH</li>
          <li>Balance (current): {Number(sale.balanceEth).toLocaleString()} ETH</li>
        </ul>
      ) : (
        <div>No data yet.</div>
      )}
    </section>
  );
}
