export function toErrorMessage(error: unknown) {
  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const message = Reflect.get(error, "message");
    if (typeof message === "string" && message.length > 0) {
      return message;
    }

    const shortMessage = Reflect.get(error, "shortMessage");
    const details = Reflect.get(error, "details");
    const fragments = [shortMessage, details].filter(
      (part): part is string => typeof part === "string" && part.length > 0,
    );

    if (fragments.length > 0) {
      return fragments.join(" | ");
    }

    try {
      return JSON.stringify(error);
    } catch {
      // Fall back to String(error) when object is not serializable.
    }
  }

  return String(error);
}
