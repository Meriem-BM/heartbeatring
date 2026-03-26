import { Notice } from "@/components/ui/notice";

import type { ActionAlertsProps } from "./types";

export function ActionAlerts({
  actionError,
  busy,
  isConnected,
  networkLabel,
  successMessage,
  wrongChain,
}: ActionAlertsProps) {
  return (
    <div className="mt-5 space-y-4">
      {!isConnected && (
        <Notice tone="default" className="rounded-lg px-3 py-2">
          Connect a wallet to interact with this ring.
        </Notice>
      )}

      {wrongChain && (
        <Notice tone="warning" className="rounded-lg px-3 py-2">
          Switch your wallet to {networkLabel} before sending transactions.
        </Notice>
      )}

      {busy && (
        <Notice tone="default" className="rounded-lg px-3 py-2">
          Transaction pending...
        </Notice>
      )}

      {successMessage && (
        <Notice tone="success" className="rounded-lg px-3 py-2">
          {successMessage}
        </Notice>
      )}

      {actionError && (
        <Notice tone="error" className="rounded-lg px-3 py-2">
          {actionError}
        </Notice>
      )}
    </div>
  );
}
