import { useState } from "react";
import type { BrowserProvider } from "ethers";
import { buyWithAuto } from "../lib/eth"; // auto path you already have
import Toast from "./ui/Toast";
import { etherscanTx, shortHash } from "../lib/ui";

type ToastState = { kind: "success" | "error"; text: string; href?: string } | null;

type Props = {
  provider?: BrowserProvider | null;
  onPurchased?: () => void;
};

export default function BuyForm({ provider, onPurchased }: Props) {
  const [ethAmount, setEthAmount] = useState<string>("0.01");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const Spinner = () => (
    <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin align-[-2px] mr-2" />
  );

  const clean = (s: string) => s.replace(",", ".").trim();

async function onBuy() {
  try {
    setBusy(true);
    setToast(null);

    if (!provider) throw new Error("Connect a wallet first.");
    const amt = clean(ethAmount);
    if (!amt || Number(amt) <= 0) throw new Error("Enter a positive amount.");

    // send tx (auto: try direct ETH, fallback to buyTokens())
    const tx = await buyWithAuto(provider, amt);


      // pending toast with short hash + etherscan link
      setToast({
        kind: "success",
        text: `Submitted ${shortHash(tx.hash)} (waiting for confirmation)`,
        href: etherscanTx(tx.hash),
      });

      // wait for 1 confirmation
      await tx.wait();

      // confirmed toast (keep the same link)
      setToast({
        kind: "success",
        text: `Success: ${shortHash(tx.hash)} (confirmed)`,
        href: etherscanTx(tx.hash),
      });


    // now it's safe to open/link Etherscan
    const href = `https://sepolia.etherscan.io/tx/${tx.hash}`;
    setToast({
      kind: "success",
      text: `Success: ${tx.hash.slice(0, 10)}… (confirmed)`,
    });
    window.open(href, "_blank");

    onPurchased?.();
  } catch (e: any) {
    const msg =
      e?.shortMessage ||
      e?.info?.error?.message ||
      e?.cause?.reason ||
      e?.message ||
      String(e);

    if (/user rejected|denied/i.test(msg)) {
      setToast({ kind: "error", text: "Action canceled." });
    } else if (/insufficient funds/i.test(msg)) {
      setToast({ kind: "error", text: "Insufficient funds. Top up Sepolia ETH." });
    } else if (/chain|network|wrong network|unsupported/i.test(msg)) {
      setToast({ kind: "error", text: "Please switch to Sepolia to continue." });
    } else if (/amount|value/i.test(msg)) {
      setToast({ kind: "error", text: "Invalid amount. Try a small positive value (e.g., 0.01)." });
    } else {
      setToast({ kind: "error", text: msg });
    }
  } finally {
    setBusy(false);
  }
}

  return (
    <section className="bg-white rounded-2xl shadow p-5 mb-6">
      <h2 className="text-lg font-semibold mb-3">Buy Tokens</h2>
      <div className="flex items-end gap-3">
        <label className="flex-1">
          <div className="text-sm text-gray-600 mb-1">Amount (ETH)</div>
          <input
            value={ethAmount}
            onChange={(e) => setEthAmount(e.target.value.replace(",", "."))}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.0001"
            placeholder="0.01"
            className="w-full border rounded-xl px-3 py-2"
          />
        </label>
        <button
          onClick={onBuy}
          disabled={busy || !provider}
          className="px-4 py-2 rounded-xl shadow border disabled:opacity-50"
          title={!provider ? "Connect a wallet" : undefined}
        >
          {busy && <Spinner />}Buy
        </button>
      </div>

      {!provider && (
        <p className="text-sm text-gray-500 mt-2">Connect a wallet to enable buying.</p>
      )}
      
      {/* <-- pass the link if present */}
      {toast && (
        <Toast
          kind={toast.kind}
          text={toast.text}
          href={toast.href}             
          onClose={() => setToast(null)}
        />
      )}
    </section>
  );
}
