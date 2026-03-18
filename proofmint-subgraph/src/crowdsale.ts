import {
  ReceiptMinted as ReceiptMintedEvent,
  TokensPurchased as TokensPurchasedEvent,
  Withdrawn as WithdrawnEvent
} from "../generated/Crowdsale/Crowdsale"
import { ReceiptMinted, TokensPurchased, Withdrawn } from "../generated/schema"

export function handleReceiptMinted(event: ReceiptMintedEvent): void {
  let entity = new ReceiptMinted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.to = event.params.to
  entity.tokenId = event.params.tokenId
  entity.paidWei = event.params.paidWei
  entity.tokensOut = event.params.tokensOut

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTokensPurchased(event: TokensPurchasedEvent): void {
  let entity = new TokensPurchased(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.buyer = event.params.buyer
  entity.value = event.params.value
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleWithdrawn(event: WithdrawnEvent): void {
  let entity = new Withdrawn(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.to = event.params.to
  entity.value = event.params.value

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
