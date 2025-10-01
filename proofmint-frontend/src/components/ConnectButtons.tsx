import { connectInjected } from "../lib/eth";
import type { Signer } from "ethers";

export default function ConnectButtons({
  account,
  onConnected,
}: {
  account?: string | null;
  onConnected: (signer: Signer, chainIdNum: number) => void;
}) {
  // When connected, render nothing (StatePanel shows status & Disconnect)
  if (account) return null;

  async function handleConnect() {
    const ws = await connectInjected(); // returns { account, chainId(hex), provider }
    const signer = await ws.provider!.getSigner();
    const net = await ws.provider!.getNetwork();
    onConnected(signer, Number(net.chainId));
  }

  return (
    <button
      onClick={handleConnect}
      className="px-3 py-1 rounded-xl border hover:bg-gray-50"
    >
      Connect Wallet
    </button>
  );
}
