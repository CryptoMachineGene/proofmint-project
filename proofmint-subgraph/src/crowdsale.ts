import { BigInt } from "@graphprotocol/graph-ts";
import {
  ReceiptMinted,
  TokensPurchased,
  Withdrawn,
} from "../generated/Crowdsale/Crowdsale";
import { Buyer, Purchase, ReceiptNFT, GlobalStat } from "../generated/schema";

function getOrCreateGlobalStat(): GlobalStat {
  let stats = GlobalStat.load("global");

  if (stats == null) {
    stats = new GlobalStat("global");
    stats.totalRaised = BigInt.zero();
    stats.totalTokensSold = BigInt.zero();
    stats.totalBuyers = 0;
    stats.totalPurchases = 0;
    stats.totalReceipts = 0;
    stats.totalWithdrawn = BigInt.zero();
    stats.save();
  }

  return stats;
}

function getOrCreateBuyer(buyerId: string): Buyer {
  let buyer = Buyer.load(buyerId);

  if (buyer == null) {
    buyer = new Buyer(buyerId);
    buyer.totalSpent = BigInt.zero();
    buyer.totalTokens = BigInt.zero();
    buyer.purchaseCount = 0;
    buyer.receiptCount = 0;
    buyer.save();

    let stats = getOrCreateGlobalStat();
    stats.totalBuyers = stats.totalBuyers + 1;
    stats.save();
  }

  return buyer;
}

export function handleTokensPurchased(event: TokensPurchased): void {
  let buyerId = event.params.buyer.toHexString();
  let buyer = getOrCreateBuyer(buyerId);
  let stats = getOrCreateGlobalStat();

  let purchaseId =
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString();

  let purchase = new Purchase(purchaseId);
  purchase.buyer = buyer.id;
  purchase.amountETH = event.params.value;
  purchase.tokensReceived = event.params.amount;
  purchase.timestamp = event.block.timestamp;
  purchase.txHash = event.transaction.hash;
  purchase.save();

  buyer.totalSpent = buyer.totalSpent.plus(event.params.value);
  buyer.totalTokens = buyer.totalTokens.plus(event.params.amount);
  buyer.purchaseCount = buyer.purchaseCount + 1;
  buyer.save();

  stats.totalRaised = stats.totalRaised.plus(event.params.value);
  stats.totalTokensSold = stats.totalTokensSold.plus(event.params.amount);
  stats.totalPurchases = stats.totalPurchases + 1;
  stats.save();
}

export function handleReceiptMinted(event: ReceiptMinted): void {
  let ownerId = event.params.to.toHexString();
  let buyer = getOrCreateBuyer(ownerId);
  let stats = getOrCreateGlobalStat();

  let receipt = new ReceiptNFT(event.params.tokenId.toString());
  receipt.owner = buyer.id;
  receipt.tokenId = event.params.tokenId;
  receipt.amountETH = event.params.paidWei;
  receipt.tokensReceived = event.params.tokensOut;
  receipt.mintedAt = event.block.timestamp;
  receipt.txHash = event.transaction.hash;
  receipt.save();

  buyer.receiptCount = buyer.receiptCount + 1;
  buyer.save();

  stats.totalReceipts = stats.totalReceipts + 1;
  stats.save();
}

export function handleWithdrawn(event: Withdrawn): void {
  let stats = getOrCreateGlobalStat();
  stats.totalWithdrawn = stats.totalWithdrawn.plus(event.params.value);
  stats.save();
}
