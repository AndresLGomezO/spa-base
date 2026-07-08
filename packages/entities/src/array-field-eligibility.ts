import type { FieldConfig, Phase1FieldType } from "./types.js";

export const ARRAY_ELIGIBLE_FIELD_TYPES = [
  "string",
  "number",
  "boolean",
  "date",
  "enum",
  "image",
  "document",
] as const satisfies readonly Phase1FieldType[];

export type ArrayEligibleFieldType =
  (typeof ARRAY_ELIGIBLE_FIELD_TYPES)[number];

export function isArrayEligibleFieldType(
  type: Phase1FieldType,
): type is ArrayEligibleFieldType {
  return (ARRAY_ELIGIBLE_FIELD_TYPES as readonly string[]).includes(type);
}

export function fieldConfigIsArray(config: FieldConfig): boolean {
  return "isArray" in config && config.isArray === true;
}
