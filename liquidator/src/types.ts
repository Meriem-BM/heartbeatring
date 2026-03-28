import type { Address, Chain, Hex } from "viem";

export type NetworkKey = "testnet" | "mainnet";
export type CliNetworkOption = NetworkKey | "both";

export type ParsedCliOptions = {
  dryRun: boolean;
  help: boolean;
  maxTxOverride?: number;
  network: CliNetworkOption;
  watch: boolean;
};

export type NetworkRuntimeConfig = {
  chain: Chain;
  factoryAddress: Address;
  key: NetworkKey;
  privateKey?: Hex;
  rpcUrl: string;
  wsRpcUrl?: string;
};

export type LiquidatorRunOptions = {
  dryRun: boolean;
  maxTxPerRun: number;
};

export type LiquidationCandidate = {
  network: NetworkKey;
  ringAddress: Address;
  targetAddress: Address;
};

export type NetworkScanReport = {
  activeRings: number;
  candidates: LiquidationCandidate[];
  delinquentTargetsFound: number;
  network: NetworkKey;
  ringsScanned: number;
};

export type ScanReport = {
  candidates: LiquidationCandidate[];
  perNetwork: NetworkScanReport[];
  totals: {
    activeRings: number;
    delinquentTargetsFound: number;
    ringsScanned: number;
  };
};

export type TxStatus = "success" | "reverted";

export type NewHeadHandlers = {
  onBlock: (blockNumber: bigint) => void;
  onError: (error: unknown) => void;
};

export type NewHeadSubscriber = (
  network: NetworkKey,
  handlers: NewHeadHandlers,
) => () => void;

export type ExecutionReport = {
  skippedByCap: number;
  txAttempted: number;
  txFailed: number;
  txFailedByNetwork: Record<NetworkKey, number>;
  txSucceeded: number;
  txSucceededByNetwork: Record<NetworkKey, number>;
};

export type RunSummary = {
  activeRings: number;
  delinquentTargetsFound: number;
  dryRun: boolean;
  maxTxPerRun: number;
  networks: NetworkKey[];
  perNetwork: Array<{
    activeRings: number;
    delinquentTargetsFound: number;
    network: NetworkKey;
    ringsScanned: number;
    txFailed: number;
    txSucceeded: number;
  }>;
  ringsScanned: number;
  skippedByCap: number;
  txAttempted: number;
  txFailed: number;
  txSucceeded: number;
};

export interface LiquidatorGateway {
  getAllRings(network: NetworkKey): Promise<Address[]>;
  getPhase(network: NetworkKey, ringAddress: Address): Promise<number>;
  getRingMembers(network: NetworkKey, ringAddress: Address): Promise<Address[]>;
  isDelinquent(
    network: NetworkKey,
    ringAddress: Address,
    participant: Address,
  ): Promise<boolean>;
  liquidate(
    network: NetworkKey,
    ringAddress: Address,
    target: Address,
  ): Promise<Hex>;
  waitForReceipt(network: NetworkKey, txHash: Hex): Promise<TxStatus>;
}
