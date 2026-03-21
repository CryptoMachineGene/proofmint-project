import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  ReceiptMinted,
  TokensPurchased,
  Withdrawn
} from "../generated/Crowdsale/Crowdsale"

export function createReceiptMintedEvent(
  to: Address,
  tokenId: BigInt,
  paidWei: BigInt,
  tokensOut: BigInt
): ReceiptMinted {
  let receiptMintedEvent = changetype<ReceiptMinted>(newMockEvent())

  receiptMintedEvent.parameters = new Array()

  receiptMintedEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  receiptMintedEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )
  receiptMintedEvent.parameters.push(
    new ethereum.EventParam(
      "paidWei",
      ethereum.Value.fromUnsignedBigInt(paidWei)
    )
  )
  receiptMintedEvent.parameters.push(
    new ethereum.EventParam(
      "tokensOut",
      ethereum.Value.fromUnsignedBigInt(tokensOut)
    )
  )

  return receiptMintedEvent
}

export function createTokensPurchasedEvent(
  buyer: Address,
  value: BigInt,
  amount: BigInt
): TokensPurchased {
  let tokensPurchasedEvent = changetype<TokensPurchased>(newMockEvent())

  tokensPurchasedEvent.parameters = new Array()

  tokensPurchasedEvent.parameters.push(
    new ethereum.EventParam("buyer", ethereum.Value.fromAddress(buyer))
  )
  tokensPurchasedEvent.parameters.push(
    new ethereum.EventParam("value", ethereum.Value.fromUnsignedBigInt(value))
  )
  tokensPurchasedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return tokensPurchasedEvent
}

export function createWithdrawnEvent(to: Address, value: BigInt): Withdrawn {
  let withdrawnEvent = changetype<Withdrawn>(newMockEvent())

  withdrawnEvent.parameters = new Array()

  withdrawnEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  withdrawnEvent.parameters.push(
    new ethereum.EventParam("value", ethereum.Value.fromUnsignedBigInt(value))
  )

  return withdrawnEvent
}
