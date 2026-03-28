import { ethereum } from "@graphprotocol/graph-ts";

import {
  BountyAccrued,
  BountyWithdrawn,
  Claimed,
  GameOver,
  Heartbeat,
  Initialized,
  Liquidated,
  Registered,
  RegistrationRefunded,
  RingFormed,
  RingRelinked,
} from "../generated/templates/HeartbeatRing/HeartbeatRing";
import { RingEvent } from "../generated/schema";

function createBaseEvent(event: ethereum.Event, name: string): RingEvent {
  const id =
    event.transaction.hash.toHexString() +
    "-" +
    event.logIndex.toString() +
    "-" +
    name;

  const entry = new RingEvent(id);
  entry.ring = event.address;
  entry.name = name;
  entry.blockNumber = event.block.number;
  entry.timestamp = event.block.timestamp;
  entry.transactionHash = event.transaction.hash;
  entry.logIndex = event.logIndex;
  return entry;
}

export function handleRegistered(event: Registered): void {
  const entry = createBaseEvent(event, "Registered");
  entry.participant = event.params.participant;
  entry.participants = event.params.position;
  entry.save();
}

export function handleRegistrationRefunded(event: RegistrationRefunded): void {
  const entry = createBaseEvent(event, "RegistrationRefunded");
  entry.participant = event.params.participant;
  entry.amount = event.params.amount;
  entry.save();
}

export function handleRingFormed(event: RingFormed): void {
  const entry = createBaseEvent(event, "RingFormed");
  entry.participants = event.params.participants;
  entry.save();
}

export function handleHeartbeat(event: Heartbeat): void {
  const entry = createBaseEvent(event, "Heartbeat");
  entry.participant = event.params.participant;
  entry.epoch = event.params.epoch;
  entry.save();
}

export function handleLiquidated(event: Liquidated): void {
  const entry = createBaseEvent(event, "Liquidated");
  entry.target = event.params.target;
  entry.epoch = event.params.epoch;
  entry.leftShare = event.params.leftShare;
  entry.rightShare = event.params.rightShare;
  entry.bounty = event.params.bounty;
  entry.save();
}

export function handleRingRelinked(event: RingRelinked): void {
  const entry = createBaseEvent(event, "RingRelinked");
  entry.ringSize = event.params.ringSize;
  entry.save();
}

export function handleGameOver(event: GameOver): void {
  const entry = createBaseEvent(event, "GameOver");
  entry.survivors = event.params.survivors;
  entry.totalPool = event.params.totalPool;
  entry.save();
}

export function handleClaimed(event: Claimed): void {
  const entry = createBaseEvent(event, "Claimed");
  entry.survivor = event.params.survivor;
  entry.amount = event.params.amount;
  entry.save();
}

export function handleBountyAccrued(event: BountyAccrued): void {
  const entry = createBaseEvent(event, "BountyAccrued");
  entry.liquidator = event.params.liquidator;
  entry.amount = event.params.amount;
  entry.save();
}

export function handleBountyWithdrawn(event: BountyWithdrawn): void {
  const entry = createBaseEvent(event, "BountyWithdrawn");
  entry.liquidator = event.params.liquidator;
  entry.amount = event.params.amount;
  entry.save();
}

export function handleInitialized(event: Initialized): void {
  const entry = createBaseEvent(event, "Initialized");
  entry.creator = event.params.creator;
  entry.save();
}
