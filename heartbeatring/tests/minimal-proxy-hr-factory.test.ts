import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { RingCreated } from "../generated/schema"
import { RingCreated as RingCreatedEvent } from "../generated/MinimalProxyHRFactory/MinimalProxyHRFactory"
import { handleRingCreated } from "../src/minimal-proxy-hr-factory"
import { createRingCreatedEvent } from "./minimal-proxy-hr-factory-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let ring = Address.fromString("0x0000000000000000000000000000000000000001")
    let creator = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let stakeAmount = BigInt.fromI32(234)
    let epochDuration = BigInt.fromI32(234)
    let liquidationGracePeriod = BigInt.fromI32(234)
    let minParticipants = BigInt.fromI32(234)
    let maxParticipants = BigInt.fromI32(234)
    let bountyBps = BigInt.fromI32(234)
    let newRingCreatedEvent = createRingCreatedEvent(
      ring,
      creator,
      stakeAmount,
      epochDuration,
      liquidationGracePeriod,
      minParticipants,
      maxParticipants,
      bountyBps
    )
    handleRingCreated(newRingCreatedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("RingCreated created and stored", () => {
    assert.entityCount("RingCreated", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "RingCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "ring",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "RingCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "creator",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "RingCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "stakeAmount",
      "234"
    )
    assert.fieldEquals(
      "RingCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "epochDuration",
      "234"
    )
    assert.fieldEquals(
      "RingCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "liquidationGracePeriod",
      "234"
    )
    assert.fieldEquals(
      "RingCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "minParticipants",
      "234"
    )
    assert.fieldEquals(
      "RingCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "maxParticipants",
      "234"
    )
    assert.fieldEquals(
      "RingCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "bountyBps",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
