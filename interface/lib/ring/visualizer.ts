import type { Address } from "viem";

export type RingNode = {
  address: Address;
  alive: boolean;
  stake: bigint;
  delinquent: boolean;
};

export const RING_VISUALIZER_SIZE = 420;

export function getRingNodeRadius(nodeCount: number) {
  return nodeCount > 14 ? 11 : 14;
}

export function positionRingNodes(nodes: readonly RingNode[]) {
  const center = RING_VISUALIZER_SIZE / 2;
  const radius = nodes.length > 1 ? 145 : 0;

  return nodes.map((node, index) => {
    const angle = (Math.PI * 2 * index) / nodes.length - Math.PI / 2;

    return {
      ...node,
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  });
}

export function buildConnectionPairs(
  nodes: readonly RingNode[],
  closeLoop: boolean,
) {
  const activeNodes = nodes.filter((node) => node.alive);

  if (activeNodes.length <= 1) return [];

  return activeNodes.flatMap((node, index) => {
    const nextNode = activeNodes[index + 1];

    if (!nextNode) {
      return closeLoop ? [[node.address, activeNodes[0]!.address] as const] : [];
    }

    return [[node.address, nextNode.address] as const];
  });
}
