import { useState } from "react";
import type { BrowserProvider } from "ethers";
import { withdraw } from "../lib/eth";
import Toast from "./ui/Toast";
import { etherscanTx, shortHash } from "../lib/ui";

type ToastState =
  | { kind: "success" | "error" | "info"; text: string; href?: string }
  | null;

type Props = {
  provider?: BrowserProvider | null;
  onWithdrew?: () => void;  // ✅ matches App.tsx
};

export default function Withdraw({ provider, onWithdrew }: Props) {  // ✅ name matches import
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const Spinner = () => (
    <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin align-[-2px] mr-2" />
  );

  async function onClick() {
    try {
      setBusy(true);
      setToast(null);

      if (!provider) throw new Error("Connect a wallet first.");

      const tx = await withdraw(provider);

      // Pending toast (optional but nicer UX)
      setToast({
        kind: "success",
        text: `Submitted ${shortHash(tx.hash)} (waiting for confirmation)`,
        href: etherscanTx(tx.hash),
      });

      await tx.wait();

      setToast({
        kind: "success",
        text: `Success: ${shortHash(tx.hash)} (confirmed)`,
        href: etherscanTx(tx.hash),
      });

      onWithdrew?.();  // ✅ callback name aligned
    } catch (e: any) {
      const msg =
        e?.shortMessage ||
        e?.info?.error?.message ||
        e?.cause?.reason ||
        e?.message ||
        String(e);

      if (/user rejected|denied/i.test(msg)) {
        setToast({ kind: "error", text: "Action canceled." });
      } else if (/unauthorized|not owner/i.test(msg)) {
        setToast({ kind: "error", text: "Only the contract owner can withdraw." });
      } else {
        setToast({ kind: "error", text: msg });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white rounded-2xl shadow p-5 mb-6">
      <h2 className="text-lg font-semibold mb-3">Withdraw Raised ETH</h2>
      <button
        onClick={onClick}
        disabled={busy || !provider}
        className="px-4 py-2 rounded-xl shadow border disabled:opacity-50"
        title={!provider ? "Connect a wallet" : undefined}
      >
        {busy && <Spinner />}Withdraw
      </button>

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
