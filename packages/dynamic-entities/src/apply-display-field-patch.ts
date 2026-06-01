import type {
  EntityDefinitionRecord,
  PatchEntityDefinitionInput,
} from "./types.js";

export function applyDisplayFieldToRecord<T extends object>(
  current: T,
  input:
    | Pick<PatchEntityDefinitionInput, "displayField">
    | CreateDisplayFieldInput,
): T {
  const existingDisplayField =
    "displayField" in current &&
    typeof (current as { displayField?: unknown }).displayField === "string"
      ? (current as { displayField: string }).displayField
      : undefined;

  if (input.displayField === null) {
    const { displayField: _removed, ...rest } = current as T & {
      displayField?: string;
    };
    void _removed;
    return rest as T;
  }
  if (typeof input.displayField === "string" && input.displayField.length > 0) {
    return { ...current, displayField: input.displayField };
  }
  if (existingDisplayField) {
    return { ...current, displayField: existingDisplayField };
  }
  const { displayField: _removed, ...rest } = current as T & {
    displayField?: string;
  };
  void _removed;
  return rest as T;
}

type CreateDisplayFieldInput = {
  readonly displayField?: string;
};

export function displayFieldForCreate(
  input: CreateDisplayFieldInput,
): Pick<EntityDefinitionRecord, "displayField"> | Record<string, never> {
  if (input.displayField && input.displayField.trim().length > 0) {
    return { displayField: input.displayField.trim() };
  }
  return {};
}
