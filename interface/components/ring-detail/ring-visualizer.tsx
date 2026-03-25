"use client";

import { getAddress } from "viem";
import { useAccount } from "wagmi";

import { useRingVisualizerData } from "@/hooks/useRingVisualizerData";
import { formatTokenValue, truncateAddress } from "@/lib/utils/format";
import {
  buildConnectionPairs,
  getRingNodeRadius,
  positionRingNodes,
  RING_VISUALIZER_SIZE,
} from "@/lib/ring/visualizer";
import type { RingAddressProps } from "@/lib/types/ring";

export function RingVisualizer({ ringAddress }: RingAddressProps) {
  const { address: connectedAddress } = useAccount();
  const normalizedConnectedAddress = connectedAddress
    ? getAddress(connectedAddress)
    : null;
  const { activeNodes, nodes, phase } = useRingVisualizerData({ ringAddress });

  if (nodes.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <p className="text-lg font-medium text-gray-100">Ring Visualizer</p>
        <p className="mt-3 text-sm text-gray-400">
          No players have joined this ring yet.
        </p>
      </section>
    );
  }

  const positionedNodes = positionRingNodes(nodes);
  const connectionPairs = buildConnectionPairs(nodes, phase !== 0);
  const nodeRadius = getRingNodeRadius(nodes.length);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-medium text-gray-100">Ring Visualizer</p>
          <p className="mt-2 text-sm text-gray-400">
            Green nodes are alive, amber nodes are delinquent, and red nodes
            have dropped out.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-400">
          <span className="rounded-full border border-gray-800 bg-gray-950 px-2 py-1">
            {activeNodes.length} alive
          </span>
          <span className="rounded-full border border-gray-800 bg-gray-950 px-2 py-1">
            {nodes.length} total
          </span>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <svg
          viewBox={`0 0 ${RING_VISUALIZER_SIZE} ${RING_VISUALIZER_SIZE}`}
          className="h-[420px] w-full max-w-[420px]"
          role="img"
          aria-label="Heartbeat ring visualizer"
        >
          {connectionPairs.map(([fromAddress, toAddress]) => {
            const fromNode = positionedNodes.find(
              (node) => node.address === fromAddress,
            );
            const toNode = positionedNodes.find(
              (node) => node.address === toAddress,
            );

            if (!fromNode || !toNode) return null;

            return (
              <line
                key={`${fromAddress}-${toAddress}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="#4b5563"
                strokeWidth="2"
              />
            );
          })}

          {positionedNodes.map((node) => {
            const isConnected =
              normalizedConnectedAddress === getAddress(node.address);
            const fill = node.alive
              ? node.delinquent
                ? "#d97706"
                : "#059669"
              : "#b91c1c";

            return (
              <g key={node.address}>
                {node.delinquent && node.alive && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={nodeRadius + 8}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                )}

                <circle
                  cx={node.x}
                  cy={node.y}
                  r={nodeRadius}
                  fill={fill}
                  stroke={isConnected ? "#f9fafb" : "#111827"}
                  strokeWidth={isConnected ? 3 : 2}
                />

                <text
                  x={node.x}
                  y={node.y + nodeRadius + 18}
                  textAnchor="middle"
                  className="fill-gray-200 text-[10px] font-mono"
                >
                  {truncateAddress(node.address)}
                </text>

                <text
                  x={node.x}
                  y={node.y + nodeRadius + 32}
                  textAnchor="middle"
                  className="fill-gray-500 text-[10px] font-mono"
                >
                  {formatTokenValue(node.stake)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
