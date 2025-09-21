import { useEffect, useState } from "react";
import type { BrowserProvider } from "ethers";
import { Contract } from "ethers";
import { withdrawRaised } from "../lib/eth";
import { CROWDSALE_ADDRESS } from "../config";
import { etherscanTx, shortHash } from "../lib/ui";
import Toast from "./ui/Toast";

const OWNABLE_ABI = ["function owner() view returns (address)"];

type Props = { provider?: BrowserProvider | null; onWithdrew?: () => void };

export default function Withdraw({ provider, onWithdrew }: Props) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{
    kind: "success" | "error" | "info";
    text: string;
    href?: string;
  } | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!provider || !CROWDSALE_ADDRESS) {
          if (!cancelled) { setConnected(false); setIsOwner(false); }
          return;
        }
        const signer = await provider.getSigner();
        const me = (await signer.getAddress()).toLowerCase();
        const ownable = new Contract(CROWDSALE_ADDRESS, OWNABLE_ABI, provider);
        const owner = ((await ownable.owner()) as string).toLowerCase();
        if (!cancelled) { setConnected(true); setIsOwner(me === owner); }
      } catch {
        if (!cancelled) { setConnected(false); setIsOwner(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [provider]);

  // Hide entirely if not connected or not owner
  if (!connected || !isOwner) return null;


  const onWithdraw = async () => {
    if (!provider || busy) return;
    try {
      setBusy(true);
      setToast({ kind: "info", text: "Sending withdraw…" });

      const tx = await withdrawRaised(provider);
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

      onWithdrew?.();
    } catch (e: any) {
      const m = String(e?.shortMessage || e?.message || e || "");
      const human =
        /user rejected/i.test(m) ? "Action canceled." :
        /insufficient funds/i.test(m) ? "Insufficient funds for gas." :
        /wrong network|unsupported chain|chain id/i.test(m) ? "Switch to Sepolia (11155111)." :
        "Withdraw failed. Check owner wallet & Sepolia.";
      setToast({ kind: "error", text: human });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow p-5 space-y-3">
      <h2 className="text-lg font-semibold">Owner Actions</h2>
      <div className="flex justify-end">
        <button
          onClick={onWithdraw}
          disabled={busy}
          className="px-4 py-2 rounded-2xl font-medium border border-transparent disabled:opacity-60"
        >
          {busy ? "Withdrawing…" : "Withdraw"}
        </button>
      </div>


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
