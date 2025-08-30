import { FormEvent, useMemo, useState } from "react";
import { buyTokens } from "../lib/eth";
import { parseEther, formatUnits } from "ethers";

interface BuyFormProps {
  disabled?: boolean;
  rate?: string; // tokens per 1 ETH (uint256 as string)
}

export default function BuyForm({ disabled, rate }: BuyFormProps) {
  const [ethAmount, setEthAmount] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  // Preview tokens out, using the same math the contract uses.
  const tokenPreview = useMemo(() => {
    try {
      if (!rate || !ethAmount) return "—";
      const wei = parseEther(ethAmount);           // bigint
      const rateBn = BigInt(rate);                 // tokens per 1 ETH (base units)
      const tokensBase = (wei * rateBn) / 10n ** 18n; // base units (assume 18 decimals)
      // Show 4 decimals for readability
      return Number.parseFloat(formatUnits(tokensBase, 18)).toFixed(4);
    } catch {
      return "—";
    }
  }, [rate, ethAmount]);

  async function onBuy(e: FormEvent) {
    e.preventDefault();
    if (!ethAmount) return;
    setBusy(true);
    try {
      const receipt = await buyTokens(ethAmount);
      console.log("Buy receipt:", receipt);
      alert("Purchase confirmed ✅");
      setEthAmount("");
    } catch (e: any) {
      console.error(e);
      alert(e?.info?.error?.message ?? e?.message ?? "Buy failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onBuy} className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-lg font-semibold mb-3">Buy Tokens</h2>

      <div className="flex items-end gap-3">
        <label className="flex-1">
          <div className="text-sm text-gray-600 mb-1">Amount (ETH)</div>
          <input
            value={ethAmount}
            onChange={(e) => setEthAmount(e.target.value)}
            type="number"
            min="0"
            step="0.0001"
            placeholder="0.001"
            className="w-full border rounded-xl px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={busy || !!disabled || !ethAmount}
          className="px-4 py-2 rounded-2xl shadow bg-indigo-600 text-white disabled:opacity-50"
        >
          {busy ? "Buying…" : "Buy"}
        </button>
      </div>

      <div className="mt-3 text-sm text-gray-600 flex items-center justify-between">
        <span>Preview (≈ tokens received)</span>
        <span className="font-mono font-semibold text-right">{tokenPreview}</span>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Sends ETH to the crowdsale; you’ll receive tokens and the receipt NFT.
      </p>
    </form>
  );
}
