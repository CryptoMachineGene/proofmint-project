import { ethers } from "ethers";
import "dotenv/config";

const rpc = process.env.RPC_URL!;
const pk = process.env.PRIVATE_KEY!;
const sale = process.env.CROWDSALE_ADDRESS!;
const eth = process.env.BUY_ETH ?? "0.01";

const abi = [
  "function buyTokens(address beneficiary) payable",
  "function rate() view returns (uint256)",
  "function token() view returns (address)"
];

async function main() {
  if (!rpc || !pk || !sale) {
    throw new Error("Missing RPC_URL, PRIVATE_KEY, or CROWDSALE_ADDRESS");
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const me = await wallet.getAddress();

  const crowdsale = new ethers.Contract(sale, abi, wallet);
  const tx = await crowdsale.buyTokens(me, { value: ethers.parseEther(eth) });
  console.log("buy tx:", tx.hash);

  const rc = await tx.wait();
  console.log("✅ confirmed in block", rc?.blockNumber);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
