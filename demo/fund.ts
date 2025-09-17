import { ethers } from "ethers";
import "dotenv/config";

const rpc = process.env.RPC_URL!;
const pk = process.env.PRIVATE_KEY!;   // funder
const to = process.env.DEMO_TO!;       // recipient
const amt = process.env.DEMO_ETH ?? "0.02";

async function main() {
  if (!rpc || !pk || !to) throw new Error("Missing RPC_URL, PRIVATE_KEY, or DEMO_TO");
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const tx = await wallet.sendTransaction({ to, value: ethers.parseEther(amt) });
  console.log("fund tx:", tx.hash);
  await tx.wait();
  console.log(`✅ funded ${to} ${amt} ETH`);
}
main().catch((e) => { console.error(e); process.exit(1); });
