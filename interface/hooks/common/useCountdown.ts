"use client";

import { useEffect, useRef, useState } from "react";

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
  const [countdown, setCountdown] = useState(Math.max(value, 0));
  const elapsedNotifiedRef = useRef(false);

  useEffect(() => {
    const nextValue = Math.max(value, 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCountdown(nextValue);

    if (nextValue > 0) {
      elapsedNotifiedRef.current = false;
    }
  }, [value]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = window.setInterval(() => {
      setCountdown((current) => (current <= 1 ? 0 : current - 1));
    }, 1_000);

    return () => window.clearInterval(interval);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || countdown > 0) {
      if (!enabled) {
        elapsedNotifiedRef.current = false;
      }
      return;
    }

    if (elapsedNotifiedRef.current) {
      return;
    }

    elapsedNotifiedRef.current = true;
    onElapsed?.();
  }, [countdown, enabled, onElapsed]);

  return enabled ? countdown : 0;
}
