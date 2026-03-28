export const factoryAbi = [
  {
    name: "getAllRings",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
] as const;

export const heartbeatRingAbi = [
  {
    name: "phase",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "getRing",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "addrs", type: "address[]" }],
  },
  {
    name: "isDelinquent",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "who", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "liquidate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "target", type: "address" }],
    outputs: [],
  },
] as const;
