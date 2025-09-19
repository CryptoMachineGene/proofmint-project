import { useEffect, useState } from "react";
import type { BrowserProvider } from "ethers";
import { Contract } from "ethers";
import { withdrawRaised } from "../lib/eth";
import { CROWDSALE_ADDRESS } from "../config";

const OWNABLE_ABI = ["function owner() view returns (address)"];

type Props = { provider?: BrowserProvider | null; onWithdrew?: () => void };

export default function Withdraw({ provider, onWithdrew }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!provider || !CROWDSALE_ADDRESS) return;
        const signer = await provider.getSigner();
        const me = (await signer.getAddress()).toLowerCase();
        const ownable = new Contract(CROWDSALE_ADDRESS, OWNABLE_ABI, provider);
        const owner = ((await ownable.owner()) as string).toLowerCase();
        if (!cancelled) setIsOwner(me === owner);
      } catch {
        if (!cancelled) setIsOwner(false);
      }
    })();
    return () => { cancelled = true; };
  }, [provider]);

  if (!isOwner) return null; // hide for non-owners

  const onClick = async () => {
    if (!provider) return;
    try {
      setBusy(true);
      setMsg("Sending withdraw…");
      const tx = await withdrawRaised(provider);
      setTxHash(tx.hash);
      setMsg("Withdraw sent, waiting for confirmation…");
      await tx.wait();
      setMsg("Withdraw confirmed ✅");
      onWithdrew?.();
    } catch (e: any) {
      const m = String(e?.shortMessage || e?.message || e || "Withdraw failed");
      setMsg(m);
    } finally {
      setBusy(false);
    }
  };

  const href = txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : undefined;

  return (
    <section className="rounded-2xl shadow p-5 space-y-3">
      <h2 className="text-lg font-semibold">Owner Actions</h2>
      <div className="flex justify-end">
        <button
          onClick={onClick}
          disabled={busy}
          className="px-4 py-2 rounded-xl border hover:bg-gray-50 disabled:opacity-60"
        >
          {busy ? "Withdrawing…" : "Withdraw Raised ETH"}
        </button>
      </div>
      {msg && (
        <p className="text-sm">
          {msg}{" "}
          {href && (
            <a className="underline" href={href} target="_blank" rel="noreferrer">
              Etherscan
            </a>
          )}
        </p>
      )}
    </section>
  );
}
