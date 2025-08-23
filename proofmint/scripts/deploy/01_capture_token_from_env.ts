import { network } from "hardhat";
import { readAddresses, writeAddresses } from "../utils/addresses";

async function main() {
  const net = network.name;
  const addrs = await readAddresses(net);
  const envToken = (process.env.TOKEN_ADDRESS || "").trim();
  if (!envToken) throw new Error("TOKEN_ADDRESS missing in .env");
  addrs.Token = envToken;
  await writeAddresses(net, addrs);
  console.log(`✅ Saved TOKEN_ADDRESS to deployments/${net}.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
