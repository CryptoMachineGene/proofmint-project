import { useEffect, useState } from "react";
import type { BrowserProvider, Signer } from "ethers";
import { BrowserProvider as EthersBrowserProvider } from "ethers";
import { CHAIN_ID, CHAIN_ID_HEX, FALLBACK_RPC, NETWORK } from "../config";

declare global {
  interface Window { ethereum?: any }
}

export default function ConnectButtons({
  onConnected,
  onDisconnected,
}: {
  onConnected?: (signer: Signer, chainId: number) => void;
  onDisconnected?: () => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [chain, setChain] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const getProvider = () => {
    if (!window.ethereum) throw new Error("No injected wallet found");
    return new EthersBrowserProvider(window.ethereum);
  };

  const hydrate = async () => {
    try {
      setErr(null);
      const provider = getProvider();
      // If the site is already approved this returns accounts, otherwise []
      const accounts: string[] = await provider.send("eth_accounts", []);
      if (accounts.length === 0) return;

      const signer = await provider.getSigner();
      const me = await signer.getAddress();
      const net = await provider.getNetwork();

      setAddress(me);
      setChain(Number(net.chainId));
      onConnected?.(signer, Number(net.chainId));
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  const connect = async () => {
    setConnecting(true);
    setErr(null);
    try {
      const provider = getProvider();
      await provider.send("eth_requestAccounts", []);
      await hydrate();

      // Re-register listeners cleanly
      window.ethereum.removeAllListeners?.("accountsChanged");
      window.ethereum.removeAllListeners?.("chainChanged");
      window.ethereum.removeAllListeners?.("disconnect");

      window.ethereum.on("accountsChanged", async (accs: string[]) => {
        if (!accs || accs.length === 0) {
          setAddress(null);
          setChain(null);
          onDisconnected?.();
          return;
        }
        await hydrate();
      });

      window.ethereum.on("chainChanged", async () => {
        await hydrate();
      });

      window.ethereum.on("disconnect", () => {
        setAddress(null);
        setChain(null);
        onDisconnected?.();
      });
    } catch (e: any) {
      const m = e?.message ?? String(e);
      if (/user rejected|denied/i.test(m)) setErr("Connection canceled.");
      else setErr(m);
    } finally {
      setConnecting(false);
    }
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;
    setErr(null);
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_ID_HEX }],
      });
    } catch (err: any) {
      // Unrecognized chain → add then switch
      if (err?.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: CHAIN_ID_HEX,
            chainName: NETWORK?.name || "Sepolia",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: [FALLBACK_RPC || (CHAIN_ID === 31337 ? "http://127.0.0.1:8545" : "")].filter(Boolean),
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          }],
        });
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN_ID_HEX }],
        });
      } else if (err?.code === 4001) {
        setErr("Network switch canceled.");
      } else {
        setErr(err?.message ?? String(err));
        console.warn("switchNetwork failed:", err);
      }
    }
  };

  useEffect(() => {
    if (window.ethereum) { hydrate().catch(() => {}); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const short = (a?: string | null) => (a ? `${a.slice(0,6)}…${a.slice(-4)}` : "");

  if (!window.ethereum) {
    return <div className="text-sm text-red-600">No injected wallet detected.</div>;
  }

  const onWrongChain = chain !== null && chain !== CHAIN_ID;

  return (
    <div className="flex items-center gap-3">
      {address ? (
        <>
          <span className="text-sm">Connected: {short(address)}</span>
          {onWrongChain && (
            <button
              onClick={switchNetwork}
              className="rounded-xl border px-3 py-1 text-sm bg-yellow-50"
              title={`Switch to ${NETWORK?.name || "Sepolia"}`}
            >
              Switch to {NETWORK?.name || "Sepolia"}
            </button>
          )}
        </>
      ) : (
        <button
          onClick={connect}
          disabled={connecting}
          className="rounded-2xl shadow px-4 py-2 text-sm font-medium"
        >
          {connecting ? "Connecting…" : "Injected (MetaMask/Brave)"}
        </button>
      )}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
