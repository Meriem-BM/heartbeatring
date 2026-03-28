"use client";

import { useEffect, useState } from "react";

type UseCountdownOptions = {
  enabled: boolean;
  onElapsed?: () => void;
  value: number;
};

export function useCountdown({
  enabled,
  onElapsed,
  value,
}: UseCountdownOptions) {
  const [countdown, setCountdown] = useState(value);

  useEffect(() => {
    setCountdown(value);
  }, [value]);

  useEffect(() => {
    if (!enabled || value <= 0) return;

    const interval = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          onElapsed?.();
          return 0;
        }

        return current - 1;
      });
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [enabled, onElapsed, value]);

  return countdown;
}
