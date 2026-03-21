import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { ReceiptMinted } from "../generated/schema"
import { ReceiptMinted as ReceiptMintedEvent } from "../generated/Crowdsale/Crowdsale"
import { handleReceiptMinted } from "../src/crowdsale"
import { createReceiptMintedEvent } from "./crowdsale-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let to = Address.fromString("0x0000000000000000000000000000000000000001")
    let tokenId = BigInt.fromI32(234)
    let paidWei = BigInt.fromI32(234)
    let tokensOut = BigInt.fromI32(234)
    let newReceiptMintedEvent = createReceiptMintedEvent(
      to,
      tokenId,
      paidWei,
      tokensOut
    )
    handleReceiptMinted(newReceiptMintedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("ReceiptMinted created and stored", () => {
    assert.entityCount("ReceiptMinted", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "ReceiptMinted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "to",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "ReceiptMinted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "tokenId",
      "234"
    )
    assert.fieldEquals(
      "ReceiptMinted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "paidWei",
      "234"
    )
    assert.fieldEquals(
      "ReceiptMinted",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "tokensOut",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
