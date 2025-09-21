// True if the chain is Sepolia
export const isSepolia = (chainId?: number | string | null) =>
  Number(chainId) === 11155111;

// Build a Sepolia Etherscan link for a tx
export const etherscanTx = (hash: string) =>
  `https://sepolia.etherscan.io/tx/${hash}`;

// Format wei bigint to ETH string
export const fmtEth = (wei?: bigint) =>
  typeof wei === "bigint" ? (Number(wei) / 1e18).toFixed(4) : "—";

// Shorten an Ethereum address for display
export const shortAddr = (addr?: string, chars = 4) =>
  addr ? `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}` : "—";

// Shorten a tx hash for display (e.g., 0x1234…abcd)
export const shortHash = (h?: string, chars = 4) =>
  h ? `${h.slice(0, 2 + chars)}…${h.slice(-chars)}` : "—";
