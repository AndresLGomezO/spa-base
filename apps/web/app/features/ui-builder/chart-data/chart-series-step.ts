import type { ChartMetricSeriesStep } from "@repo/ui-builder-core";

export function interpolateChartSeriesOffsets(
  step: ChartMetricSeriesStep,
  bucketCount: number,
): readonly number[] {
  if (bucketCount <= 1) {
    return [step.offsetEnd];
  }

  const offsets: number[] = [];
  for (let index = 0; index < bucketCount; index += 1) {
    const ratio = index / (bucketCount - 1);
    const offset = Math.round(
      step.offsetStart + (step.offsetEnd - step.offsetStart) * ratio,
    );
    offsets.push(offset);
  }
  return offsets;
}
