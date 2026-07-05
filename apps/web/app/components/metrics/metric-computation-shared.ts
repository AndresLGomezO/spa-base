import type { ComputedMetricInputRef } from "@repo/metrics-engine/browser";

export const selectClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";

export function createEmptyMetricRef(): ComputedMetricInputRef {
  return {
    type: "metricRef",
    metricDefinitionId: "",
    parameterMap: {},
  };
}

export function createEmptyQueryRef(): ComputedMetricInputRef {
  return {
    type: "queryRef",
    queryDefinitionId: "",
    parameterMap: {},
    aggregationOperation: "SUM",
    aggregationField: "",
  };
}

export function parameterMapToEntries(
  parameterMap: Readonly<Record<string, string>>,
): readonly { readonly key: string; readonly value: string }[] {
  return Object.entries(parameterMap).map(([key, value]) => ({ key, value }));
}

export function appendParameterMapEntry(
  parameterMap: Readonly<Record<string, string>>,
): Record<string, string> {
  let index = Object.keys(parameterMap).length + 1;
  let candidate = `field${String(index)}`;
  while (candidate in parameterMap) {
    index += 1;
    candidate = `field${String(index)}`;
  }
  return { ...parameterMap, [candidate]: "" };
}

export function renameParameterMapKey(
  parameterMap: Readonly<Record<string, string>>,
  oldKey: string,
  newKey: string,
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(parameterMap)) {
    next[key === oldKey ? newKey : key] = value;
  }
  return next;
}

export function updateParameterMapValue(
  parameterMap: Readonly<Record<string, string>>,
  key: string,
  value: string,
): Record<string, string> {
  return { ...parameterMap, [key]: value };
}

export function removeParameterMapKey(
  parameterMap: Readonly<Record<string, string>>,
  key: string,
): Record<string, string> {
  const next = { ...parameterMap };
  delete next[key];
  return next;
}
