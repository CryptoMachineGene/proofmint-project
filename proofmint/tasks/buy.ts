// tasks/buy.ts
import { task } from "hardhat/config";

task("buy", "Buy tokens from the crowdsale with native ETH")
  .addParam("crowdsale", "Crowdsale contract address")
  .addParam("eth", "ETH amount to send (e.g., 0.001)")
  .setAction(async ({ crowdsale, eth }, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const sale = await hre.ethers.getContractAt("Crowdsale", crowdsale, signer);

    console.log("Buyer:", signer.address);
    console.log("Crowdsale:", crowdsale);
    console.log("Sending ETH:", eth);

    // call buyTokens() and attach value
    const tx = await sale.buyTokens({ value: hre.ethers.parseEther(eth) });
    console.log("Tx hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("Mined in block:", receipt?.blockNumber);

    // Try to parse the TokensPurchased event
    try {
      const iface = new hre.ethers.Interface([
        "event TokensPurchased(address indexed buyer, uint256 value, uint256 amount)"
      ]);
      for (const log of receipt!.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "TokensPurchased") {
            console.log("TokensPurchased =>", {
              buyer: parsed.args[0],
              value: parsed.args[1].toString(),
              amount: parsed.args[2].toString(),
            });
          }
        } catch { /* ignore unrelated logs */ }
      }
    } catch {}
  });
