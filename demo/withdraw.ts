import { ethers } from "ethers";
import "dotenv/config";

const rpc = process.env.RPC_URL!;
const pk = process.env.PRIVATE_KEY!;
const sale = process.env.CROWDSALE_ADDRESS!;

const abi = [
  "function withdraw()",
  "function wallet() view returns (address)"
];

async function main() {
  if (!rpc || !pk || !sale) throw new Error("Missing RPC_URL, PRIVATE_KEY, or CROWDSALE_ADDRESS");
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const crowdsale = new ethers.Contract(sale, abi, wallet);

  const tx = await crowdsale.withdraw();
  console.log("withdraw tx:", tx.hash);
  await tx.wait();
  console.log("✅ withdraw complete");
}
main().catch((e) => { console.error(e); process.exit(1); });
