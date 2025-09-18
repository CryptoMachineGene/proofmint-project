import { useEffect, useState } from "react";
import { BrowserProvider, Signer } from "ethers";
import { CHAIN_ID, CHAIN_ID_HEX, FALLBACK_RPC } from "../env";

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

  const getProvider = () => {
    if (!window.ethereum) throw new Error("No injected wallet found");
    return new BrowserProvider(window.ethereum);
  };

  const hydrate = async () => {
    const provider = getProvider();
    const accounts: string[] = await provider.send("eth_accounts", []);
    if (accounts.length === 0) return;
    const signer = await provider.getSigner();
    const net = await provider.getNetwork();
    setAddress((await signer.getAddress()));
    setChain(Number(net.chainId));
    onConnected?.(signer, Number(net.chainId));
  };

  const connect = async () => {
    setConnecting(true);
    try {
      const provider = getProvider();
      await provider.send("eth_requestAccounts", []);
      await hydrate();
      // listeners (re-register cleanly)
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
    } finally {
      setConnecting(false);
    }
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_ID_HEX }],
      });
    } catch (err: any) {
      // If chain is unknown, add it then switch
      if (err?.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: CHAIN_ID_HEX,
            chainName: CHAIN_ID === 31337 ? "Localhost 8545" : "Sepolia",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: [FALLBACK_RPC ?? (CHAIN_ID === 31337 ? "http://127.0.0.1:8545" : "")].filter(Boolean),
            blockExplorerUrls: [],
          }],
        });
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN_ID_HEX }],
        });
      } else {
        console.warn("switchNetwork failed:", err);
      }
    }
  };

  useEffect(() => {
    // auto-hydrate if user already approved this site
    if (window.ethereum) { hydrate().catch(() => {}); }
  }, []);

  const short = (a?: string | null) => a ? `${a.slice(0,6)}…${a.slice(-4)}` : "";

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
            <button onClick={switchNetwork} className="rounded-xl border px-3 py-1 text-sm">
              Switch to {CHAIN_ID} (auto)
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
    </div>
  );
}
