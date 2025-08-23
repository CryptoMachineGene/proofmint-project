// tasks/crowdsale.ts
import { task } from "hardhat/config";
import { readAddresses } from "../scripts/utils/addresses";

task("crowdsale:info")
  .addOptionalParam("sale", "Crowdsale address (defaults to deployments file)")
  .setAction(async ({ sale }, hre) => {
    if (!sale) {
      const addrs = await readAddresses(hre.network.name);
      sale = addrs.Crowdsale;
      if (!sale) throw new Error("No Crowdsale in deployments; pass --sale");
    }
    const cs = await hre.ethers.getContractAt("Crowdsale", sale);
    const [token, nft, owner, rate, cap, raised] = await Promise.all([
      (cs as any).token(), (cs as any).receiptNFT(), (cs as any).owner(),
      (cs as any).rate(), (cs as any).cap(), (cs as any).weiRaised(),
    ]);
    console.log(JSON.stringify({
      sale, token, nft, owner,
      rate: rate.toString(), cap: cap.toString(),
      weiRaised: raised.toString(), remaining: (cap - raised).toString()
    }, null, 2));
  });

// Quote how many tokens you'd get for X ETH
task("crowdsale:quote", "Quote tokens out for an ETH amount")
  .addParam("sale", "Crowdsale address")
  .addParam("eth",  "ETH amount, e.g. 0.001")
  .setAction(async ({ sale, eth }, { ethers }) => {
    const cs   = await ethers.getContractAt("Crowdsale", sale);
    const rate = await (cs as any).rate();
    const wei  = ethers.parseEther(eth);
    const out  = (wei * rate) / 10n ** 18n;
    console.log(JSON.stringify({ sale, eth, wei: wei.toString(), rate: rate.toString(), tokensOut: out.toString() }, null, 2));
  });

// Buy from crowdsale
task("crowdsale:buy", "Buy tokens")
  .addParam("sale", "Crowdsale address")
  .addParam("eth",  "ETH amount, e.g. 0.001")
  .setAction(async ({ sale, eth }, { ethers }) => {
    const cs  = await ethers.getContractAt("Crowdsale", sale);
    const tx  = await cs.buyTokens({ value: ethers.parseEther(eth) });
    console.log("tx:", tx.hash);
    await tx.wait();
    console.log("✅ bought", eth, "ETH worth");
  });

// Withdraw ETH to owner
task("crowdsale:withdraw", "Owner-only: withdraw all ETH")
  .addParam("sale", "Crowdsale address")
  .setAction(async ({ sale }, { ethers }) => {
    const cs = await ethers.getContractAt("Crowdsale", sale);
    const tx = await cs.withdraw();
    console.log("tx:", tx.hash);
    await tx.wait();
    console.log("✅ withdrawn");
  });

// Convenience: grant MINTER_ROLE on ProofNFT to the Crowdsale
// (Reads the NFT address from the sale, then calls grantRole on the NFT)
task("crowdsale:grant-nft-minter", "Grant NFT MINTER_ROLE to the Crowdsale")
  .addParam("sale", "Crowdsale address")
  .setAction(async ({ sale }, { ethers }) => {
    const cs  = await ethers.getContractAt("Crowdsale", sale);
    const nftAddr = await (cs as any).receiptNFT();
    const nft = await ethers.getContractAt("ProofNFT", nftAddr);
    const role = await (nft as any).MINTER_ROLE();
    const tx = await (nft as any).grantRole(role, sale);
    console.log("tx:", tx.hash);
    await tx.wait();
    console.log(`✅ Granted MINTER_ROLE on NFT ${nftAddr} to crowdsale ${sale}`);
  });
