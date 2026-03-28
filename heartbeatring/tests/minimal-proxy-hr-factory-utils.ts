import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import { RingCreated } from "../generated/MinimalProxyHRFactory/MinimalProxyHRFactory"

export function createRingCreatedEvent(
  ring: Address,
  creator: Address,
  stakeAmount: BigInt,
  epochDuration: BigInt,
  liquidationGracePeriod: BigInt,
  minParticipants: BigInt,
  maxParticipants: BigInt,
  bountyBps: BigInt
): RingCreated {
  let ringCreatedEvent = changetype<RingCreated>(newMockEvent())

  ringCreatedEvent.parameters = new Array()

  ringCreatedEvent.parameters.push(
    new ethereum.EventParam("ring", ethereum.Value.fromAddress(ring))
  )
  ringCreatedEvent.parameters.push(
    new ethereum.EventParam("creator", ethereum.Value.fromAddress(creator))
  )
  ringCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "stakeAmount",
      ethereum.Value.fromUnsignedBigInt(stakeAmount)
    )
  )
  ringCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "epochDuration",
      ethereum.Value.fromUnsignedBigInt(epochDuration)
    )
  )
  ringCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "liquidationGracePeriod",
      ethereum.Value.fromUnsignedBigInt(liquidationGracePeriod)
    )
  )
  ringCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "minParticipants",
      ethereum.Value.fromUnsignedBigInt(minParticipants)
    )
  )
  ringCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "maxParticipants",
      ethereum.Value.fromUnsignedBigInt(maxParticipants)
    )
  )
  ringCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "bountyBps",
      ethereum.Value.fromUnsignedBigInt(bountyBps)
    )
  )

  return ringCreatedEvent
}
