"use client";

import { useMemo, useState } from "react";

import {
  DEFAULT_CREATE_RING_FORM_STATE,
  getDefaultGracePeriod,
  getGracePeriodOptions,
  type CreateRingFormState,
} from "@/lib/ring/create";

export function useCreateRingFormState() {
  const [formState, setFormState] = useState<CreateRingFormState>(
    DEFAULT_CREATE_RING_FORM_STATE,
  );

  const graceOptions = useMemo(
    () => getGracePeriodOptions(Number(formState.epochDuration)),
    [formState.epochDuration],
  );

  function updateField(key: keyof CreateRingFormState, value: string) {
    if (key === "epochDuration") {
      const nextGraceOptions = getGracePeriodOptions(Number(value));

      setFormState((current) => ({
        ...current,
        epochDuration: value,
        liquidationGracePeriod: nextGraceOptions.some(
          (option) => `${option.value}` === current.liquidationGracePeriod,
        )
          ? current.liquidationGracePeriod
          : getDefaultGracePeriod(Number(value)),
      }));

      return;
    }

    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return {
    formState,
    graceOptions,
    updateField,
  };
}
