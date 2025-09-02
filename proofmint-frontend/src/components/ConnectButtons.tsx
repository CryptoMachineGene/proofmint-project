import { useState } from "react";
import { connectInjected, connectWalletConnect, hasInjected } from "../lib/eth";
import type { Signer } from "ethers";
import { WC_PROJECT_ID } from "../config";
import Toast from "./ui/Toast";

type Props = { onConnected: (signer: Signer, label: "Injected" | "WalletConnect") => void; };

export default function ConnectButtons({ onConnected }: Props) {
  const [busy, setBusy] = useState<"injected" | "wc" | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function doConnectInjected() {
    setBusy("injected");
    try { const s = await connectInjected(); onConnected(s, "Injected"); setToast({ kind: "success", text: "Wallet connected (Injected)" }); }
    catch (e: any) { setToast({ kind: "error", text: e?.message ?? String(e) }); }
    finally { setBusy(null); }
  }
  async function doConnectWC() {
    setBusy("wc");
    try { const s = await connectWalletConnect(); onConnected(s, "WalletConnect"); setToast({ kind: "success", text: "Wallet connected (WalletConnect)" }); }
    catch (e: any) { setToast({ kind: "error", text: e?.message ?? String(e) }); }
    finally { setBusy(null); }
  }

  const Spinner = () => <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin align-[-2px] mr-2" />;

  return (
    <section className="bg-white rounded-2xl shadow p-5 mb-6">
      <h2 className="text-lg font-semibold mb-3">Connect Wallet</h2>
      <div className="flex gap-3">
        <button onClick={doConnectInjected} disabled={!!busy || !hasInjected()} className="px-4 py-2 rounded-xl shadow border disabled:opacity-50">
          {busy === "injected" && <Spinner />}{hasInjected() ? "Injected (MetaMask/Brave)" : "No Injected Wallet"}
        </button>
        {WC_PROJECT_ID && (
          <button onClick={doConnectWC} disabled={!!busy} className="px-4 py-2 rounded-2xl shadow border disabled:opacity-50">
            {busy === "wc" && <Spinner />}WalletConnect
          </button>
        )}
      </div>
      {toast && <Toast kind={toast.kind} text={toast.text} onClose={() => setToast(null)} />}
    </section>
  );
}
