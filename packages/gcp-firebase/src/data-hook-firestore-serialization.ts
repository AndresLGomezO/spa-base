import type {
  DataHookCondition,
  DataHookDefinition,
  DataHookTrigger,
} from "@repo/hooks";
import type { DataHookAction } from "@repo/hooks";

const SERIALIZED_MARKER = "_hookExpressionFieldsSerialized" as const;

type FirestoreHookPayload = Record<string, unknown>;

function parseJsonField<T>(value: unknown, fieldName: string): T {
  if (typeof value !== "string") {
    throw new Error(
      `Expected serialized data hook field "${fieldName}" to be a string.`,
    );
  }
  return JSON.parse(value) as T;
}

/** Firestore documents cannot exceed 20 nesting levels; stringify hook AST fields on write. */
export function serializeDataHookForFirestore(
  record: DataHookDefinition,
): FirestoreHookPayload {
  return {
    ...record,
    trigger: JSON.stringify(record.trigger),
    condition:
      record.condition === null ? null : JSON.stringify(record.condition),
    actions: JSON.stringify(record.actions),
    [SERIALIZED_MARKER]: true,
  };
}

export function deserializeDataHookFromFirestore(
  data: FirestoreHookPayload,
): Record<string, unknown> {
  const { [SERIALIZED_MARKER]: _marker, ...rest } = data;

  void _marker;

  const trigger =
    typeof rest.trigger === "string"
      ? parseJsonField<DataHookTrigger>(rest.trigger, "trigger")
      : rest.trigger;
  const actions =
    typeof rest.actions === "string"
      ? parseJsonField<readonly DataHookAction[]>(rest.actions, "actions")
      : rest.actions;
  const condition =
    rest.condition === null || rest.condition === undefined
      ? (rest.condition ?? null)
      : typeof rest.condition === "string"
        ? parseJsonField<DataHookCondition>(rest.condition, "condition")
        : rest.condition;

  return {
    ...rest,
    trigger,
    actions,
    condition,
  };
}
