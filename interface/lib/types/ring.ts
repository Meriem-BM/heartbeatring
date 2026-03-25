import type { Address, Hex } from "viem";

export type RingPhase = 0 | 1 | 2;

export type RingAddressProps = {
  ringAddress: string;
};

export type ReadResult<T> = {
  result?: T;
  status?: "success" | "failure";
};

export type ParticipantData = readonly [
  Address,
  Address,
  bigint,
  bigint,
  boolean,
];

export type RawLog = {
  blockNumber: bigint | null;
  data: Hex;
  logIndex: number | null;
  topics: readonly Hex[];
  transactionHash: Hex | null;
};

export type EventEntry = {
  blockNumber: bigint;
  colorClass: string;
  id: string;
  logIndex: number;
  message: string;
};
