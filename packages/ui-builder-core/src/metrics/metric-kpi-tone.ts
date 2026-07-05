export type MetricKpiTonePolarity = "normal" | "inverted";

export function resolveMetricKpiValueToneClass(
  value: number | null | undefined,
  options: {
    readonly showToneColors?: boolean;
    readonly tonePolarity?: MetricKpiTonePolarity;
  },
): string {
  if (!options.showToneColors) {
    return "";
  }

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value) ||
    value === 0
  ) {
    return "";
  }

  const positiveIsGood = options.tonePolarity !== "inverted";
  if (value > 0) {
    return positiveIsGood ? "text-success" : "text-destructive";
  }

  return positiveIsGood ? "text-destructive" : "text-success";
}
