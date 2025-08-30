interface StateData {
  rate?: string;
  capEth?: string;
  raisedEth?: string;
  nftsMinted?: string;
}
interface StatePanelProps {
  data: StateData | null;
  onRefresh: () => void;
  refreshing: boolean;
}

export default function StatePanel({ data, onRefresh, refreshing }: StatePanelProps) {
  const { rate, capEth, raisedEth, nftsMinted } = data || {};
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Sale Status</h2>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="px-3 py-1.5 rounded-xl bg-gray-900 text-white disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <ul className="grid grid-cols-2 gap-3 text-sm">
        <li className="p-3 rounded-xl bg-gray-50">
          <div className="text-gray-500">Rate</div>
          <div className="font-mono text-right font-semibold">
            {rate ?? "—"} tokens / ETH
          </div>
        </li>
        <li className="p-3 rounded-xl bg-gray-50">
          <div className="text-gray-500">Hard Cap (ETH)</div>
          <div className="font-mono text-right font-semibold">
            {capEth ?? "—"}
          </div>
        </li>
        <li className="p-3 rounded-xl bg-gray-50">
          <div className="text-gray-500">Raised (ETH)</div>
          <div className="font-mono text-right font-semibold">
            {raisedEth ?? "—"}
          </div>
        </li>
        <li className="p-3 rounded-xl bg-gray-50">
          <div className="text-gray-500">NFTs Minted</div>
          <div className="font-mono text-right font-semibold">
            {nftsMinted ?? "—"}
          </div>
        </li>
      </ul>
    </div>
  );
}
