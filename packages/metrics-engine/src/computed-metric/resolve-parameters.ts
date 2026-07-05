import { shiftMetricDateBucket } from "../date-granularity.js";
import type { MetricDefinitionParameter } from "./types.js";

export class ComputedMetricParameterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComputedMetricParameterError";
  }
}

function normalizeParameterValue(
  parameter: MetricDefinitionParameter,
  raw: unknown,
): string | number | boolean {
  if (parameter.valueType === "number") {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === "string" && raw.trim().length > 0) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    throw new ComputedMetricParameterError(
      `Parameter "${parameter.name}" requires a numeric value.`,
    );
  }

  if (parameter.valueType === "string") {
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim();
    }
    if (typeof raw === "number" || typeof raw === "boolean") {
      return String(raw);
    }
    throw new ComputedMetricParameterError(
      `Parameter "${parameter.name}" requires a string value.`,
    );
  }

  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new ComputedMetricParameterError(
      `Parameter "${parameter.name}" requires a date bucket value.`,
    );
  }

  return raw.trim();
}

export function resolveComputedMetricParameters(input: {
  readonly parameters: readonly MetricDefinitionParameter[];
  readonly provided: Readonly<Record<string, unknown>>;
}): Record<string, string | number | boolean> {
  const resolved: Record<string, string | number | boolean> = {};

  for (const parameter of input.parameters) {
    if (parameter.deriveFrom) {
      continue;
    }

    if (!(parameter.name in input.provided)) {
      throw new ComputedMetricParameterError(
        `Missing required parameter "${parameter.name}".`,
      );
    }

    resolved[parameter.name] = normalizeParameterValue(
      parameter,
      input.provided[parameter.name],
    );
  }

  for (const parameter of input.parameters) {
    if (!parameter.deriveFrom) {
      continue;
    }

    const sourceValue = resolved[parameter.deriveFrom.parameter];
    if (sourceValue === undefined) {
      throw new ComputedMetricParameterError(
        `Derived parameter "${parameter.name}" requires source "${parameter.deriveFrom.parameter}".`,
      );
    }

    if (parameter.valueType !== "dateBucket") {
      throw new ComputedMetricParameterError(
        `Derived parameter "${parameter.name}" only supports dateBucket values.`,
      );
    }

    const shifted = shiftMetricDateBucket(
      String(sourceValue),
      parameter.deriveFrom.shift.unit,
      parameter.deriveFrom.shift.offset,
    );

    if (shifted === null) {
      throw new ComputedMetricParameterError(
        `Unable to derive parameter "${parameter.name}" from "${parameter.deriveFrom.parameter}".`,
      );
    }

    resolved[parameter.name] = shifted;
  }

  return resolved;
}
