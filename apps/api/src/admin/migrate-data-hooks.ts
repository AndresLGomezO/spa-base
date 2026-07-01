import {
  dataHookDefinitionSchema,
  parseHookEvent,
  type DataHookAction,
  type DataHookDefinition,
  type ExpressionNode,
} from "@repo/hooks";
import { z } from "zod";

/**
 * One-off migration from the legacy static `hooks` collection to the new
 * expression-driven `__data_hooks` collection. Reads legacy documents, maps
 * static values to `literal` expressions, and writes the converted
 * definitions. Legacy documents are left in place (non-destructive).
 */

const legacyActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("updateField"),
    field: z.string(),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal("createRecord"),
    entity: z.string(),
    data: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal("sendNotification"),
    message: z.string(),
  }),
]);

const legacyHookSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  entity: z.string(),
  event: z.string(),
  config: z.object({ actions: z.array(legacyActionSchema) }),
  enabled: z.boolean().default(true),
  order: z.number().default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

type LegacyHook = z.infer<typeof legacyHookSchema>;

function toLiteral(value: unknown): ExpressionNode {
  if (
    value == null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return { kind: "literal", value: value ?? null };
  }
  // Non-primitive legacy values are preserved as JSON text.
  return { kind: "literal", value: JSON.stringify(value) };
}

function convertAction(
  action: LegacyHook["config"]["actions"][number],
): DataHookAction {
  switch (action.type) {
    case "updateField":
      return {
        type: "setField",
        field: action.field,
        value: toLiteral(action.value),
      };
    case "createRecord": {
      const data: Record<string, ExpressionNode> = {};
      for (const [key, value] of Object.entries(action.data)) {
        data[key] = toLiteral(value);
      }
      return { type: "createRecord", entity: action.entity, data };
    }
    case "sendNotification":
      return {
        type: "sendNotification",
        message: { kind: "literal", value: action.message },
      };
  }
}

export function convertLegacyHook(raw: unknown): DataHookDefinition {
  const legacy = legacyHookSchema.parse(raw);
  const parsedEvent = parseHookEvent(legacy.event);
  const now = new Date().toISOString();

  return dataHookDefinitionSchema.parse({
    id: legacy.id,
    tenantId: legacy.tenantId,
    name: legacy.name,
    entity: legacy.entity,
    phase: parsedEvent.phase,
    trigger: { operation: parsedEvent.operation },
    condition: null,
    actions: legacy.config.actions.map(convertAction),
    enabled: legacy.enabled,
    order: legacy.order,
    createdAt: legacy.createdAt ?? now,
    updatedAt: now,
  });
}
