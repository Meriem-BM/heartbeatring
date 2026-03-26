export const LOGS_UNAVAILABLE_MESSAGE =
  "Historical event logs are unavailable on the selected RPC endpoint.";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function collectErrorMessages(
  error: unknown,
  seen = new Set<unknown>(),
): string[] {
  if (!error || seen.has(error)) return [];

  if (typeof error === "string") {
    return [error];
  }

  if (typeof error !== "object") {
    return [];
  }

  seen.add(error);

  const nextError = error as {
    cause?: unknown;
    details?: unknown;
    message?: unknown;
    metaMessages?: unknown;
    shortMessage?: unknown;
  };

  const messages = [
    readString(nextError.shortMessage),
    readString(nextError.details),
    readString(nextError.message),
    ...(Array.isArray(nextError.metaMessages)
      ? nextError.metaMessages
          .map((message) => readString(message))
          .filter(Boolean)
      : []),
  ].filter(Boolean);

  return [...messages, ...collectErrorMessages(nextError.cause, seen)];
}

function sanitizeErrorMessage(message: string) {
  const normalized = message
    .replace(/\s+/g, " ")
    .replace(/\s+URL:.*$/i, "")
    .replace(/\s+Request body:.*$/i, "")
    .replace(/\s+Version:.*$/i, "")
    .trim();

  if (/user rejected|user denied|rejected the request/i.test(normalized)) {
    return "Request rejected in wallet.";
  }

  if (/eth_getLogs/i.test(normalized) && /does not exist|not available/i.test(normalized)) {
    return LOGS_UNAVAILABLE_MESSAGE;
  }

  return normalized;
}

export function getErrorMessage(error: unknown, fallback = "Transaction failed.") {
  for (const candidate of collectErrorMessages(error)) {
    const normalized = sanitizeErrorMessage(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return fallback;
}

