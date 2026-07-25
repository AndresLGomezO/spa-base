import {
  hashSourceValue,
  truncateText,
  type AiContextSectionBlock,
  type AiContextSectionRecord,
} from "@repo/ai-context";

import { USER_AI_MEMORY_SNAPSHOT_MAX_CHARS } from "./constants.js";

export interface AssembledSectionBlockResult {
  readonly sectionId: string;
  readonly blockIndex: number;
  readonly chars: number;
  readonly ok: boolean;
  readonly error?: string;
}

export interface AssembleUserContextSectionsResult {
  readonly text: string;
  readonly sourceHash: string;
  readonly resolvedBlocks: readonly AssembledSectionBlockResult[];
}

export interface UserContextSectionDataPorts {
  getEntityField(args: {
    readonly entityName: string;
    readonly field: string;
    readonly source: "singleton" | "recordId" | "firstMatch";
    readonly recordId?: string;
    readonly where?: readonly {
      readonly field: string;
      readonly operator: string;
      readonly value: unknown;
    }[];
  }): Promise<unknown>;
  listEntityRecords(args: {
    readonly entityName: string;
    readonly fields: readonly string[];
    readonly where?: readonly {
      readonly field: string;
      readonly operator: string;
      readonly value: unknown;
    }[];
    readonly limit: number;
  }): Promise<readonly Record<string, unknown>[]>;
  getMetricValue?(args: {
    readonly metricDefinitionId: string;
    readonly parameterMap?: Record<string, unknown>;
  }): Promise<unknown>;
  runSavedQuery?(args: {
    readonly queryDefinitionId: string;
    readonly fields: readonly string[];
    readonly limit: number;
  }): Promise<readonly Record<string, unknown>[]>;
}

function formatValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatRecordsAsList(
  records: readonly Record<string, unknown>[],
  fields: readonly string[],
): string {
  return records
    .map((record, index) => {
      const parts = fields
        .map((field) => {
          const value = formatValue(record[field]);
          return value ? `${field}: ${value}` : null;
        })
        .filter((part): part is string => Boolean(part));
      return `${index + 1}. ${parts.join(" | ")}`;
    })
    .join("\n");
}

function formatRecordsAsTable(
  records: readonly Record<string, unknown>[],
  fields: readonly string[],
): string {
  const header = `| ${fields.join(" | ")} |`;
  const sep = `| ${fields.map(() => "---").join(" | ")} |`;
  const rows = records.map(
    (record) =>
      `| ${fields.map((field) => formatValue(record[field]).replace(/\|/g, "\\|")).join(" | ")} |`,
  );
  return [header, sep, ...rows].join("\n");
}

function userHasPermissions(
  userPermissions: readonly string[] | undefined,
  required: readonly string[] | undefined,
): boolean {
  if (!required || required.length === 0) return true;
  if (!userPermissions) return false;
  const set = new Set(userPermissions);
  return required.every((permission) => set.has(permission) || set.has("*"));
}

async function resolveBlock(
  ports: UserContextSectionDataPorts,
  block: AiContextSectionBlock,
): Promise<{
  readonly text: string;
  readonly ok: boolean;
  readonly error?: string;
}> {
  try {
    switch (block.kind) {
      case "staticMarkdown": {
        const label = block.label ? `### ${block.label}\n` : "";
        return { text: `${label}${block.content}`.trim(), ok: true };
      }
      case "entityField": {
        const value = await ports.getEntityField({
          entityName: block.entityName,
          field: block.field,
          source: block.source,
          ...(block.recordId ? { recordId: block.recordId } : {}),
          ...(block.where ? { where: block.where } : {}),
        });
        const formatted = formatValue(value).trim();
        if (!formatted) {
          const missing = block.missingText?.trim() ?? "";
          return {
            text: missing,
            ok: missing.length > 0,
            ...(missing ? {} : { error: "missing field value" }),
          };
        }
        const label = block.label ? `### ${block.label}\n` : "";
        const prefix = block.prefix ? `${block.prefix}` : "";
        return { text: `${label}${prefix}${formatted}`.trim(), ok: true };
      }
      case "entityRecordsSummary": {
        const records = await ports.listEntityRecords({
          entityName: block.entityName,
          fields: block.fields,
          limit: block.limit,
          ...(block.where ? { where: block.where } : {}),
        });
        if (records.length === 0) {
          return { text: "", ok: true };
        }
        const body =
          block.joinAs === "table"
            ? formatRecordsAsTable(records, block.fields)
            : formatRecordsAsList(records, block.fields);
        const label = block.label ? `### ${block.label}\n` : "";
        return { text: `${label}${body}`.trim(), ok: true };
      }
      case "metricValue": {
        if (!ports.getMetricValue) {
          return { text: "", ok: false, error: "metric resolver unavailable" };
        }
        const value = await ports.getMetricValue({
          metricDefinitionId: block.metricDefinitionId,
          ...(block.parameterMap ? { parameterMap: block.parameterMap } : {}),
        });
        const formatted = formatValue(value).trim();
        if (!formatted) {
          return { text: "", ok: true };
        }
        const label = block.label ? `### ${block.label}\n` : "";
        return { text: `${label}${formatted}`.trim(), ok: true };
      }
      case "savedQueryTop": {
        if (!ports.runSavedQuery) {
          return { text: "", ok: false, error: "query resolver unavailable" };
        }
        const records = await ports.runSavedQuery({
          queryDefinitionId: block.queryDefinitionId,
          fields: block.fields,
          limit: block.limit,
        });
        if (records.length === 0) {
          return { text: "", ok: true };
        }
        const body = formatRecordsAsList(records, block.fields);
        const label = block.label ? `### ${block.label}\n` : "";
        return { text: `${label}${body}`.trim(), ok: true };
      }
      default: {
        const exhaustive: never = block;
        return {
          text: "",
          ok: false,
          error: `Unknown block kind: ${JSON.stringify(exhaustive)}`,
        };
      }
    }
  } catch (error) {
    return {
      text: "",
      ok: false,
      error: error instanceof Error ? error.message : "Block resolve failed",
    };
  }
}

function blockTargetsOtherUserData(
  block: AiContextSectionBlock,
  userId: string,
): boolean {
  // Hardcoded recordId blocks under perUser scope are still resolved via
  // ACL-aware ports; only skip when the block explicitly targets another
  // user's ownership key in a where clause.
  if (block.kind !== "entityField" && block.kind !== "entityRecordsSummary") {
    return false;
  }
  const where = "where" in block ? block.where : undefined;
  if (!where?.length) return false;
  return where.some((condition) => {
    if (condition.field !== "ownerId" && condition.field !== "accessUserIds") {
      return false;
    }
    if (condition.operator === "eq" && typeof condition.value === "string") {
      return condition.value !== userId;
    }
    if (condition.operator === "in" && Array.isArray(condition.value)) {
      return !condition.value.includes(userId);
    }
    return false;
  });
}

/**
 * Resolve enabled sections for a user and concatenate block text into a
 * durable L2 snapshot. Sections missing required permissions are skipped.
 * `perUser` sections skip blocks that explicitly target another user's data.
 */
export async function resolveAndAssembleUserContextSections(input: {
  readonly sections: readonly AiContextSectionRecord[];
  readonly ports: UserContextSectionDataPorts;
  readonly userId: string;
  readonly userPermissions: readonly string[];
  readonly catalogHash?: string;
}): Promise<AssembleUserContextSectionsResult> {
  const enabled = [...input.sections]
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  const parts: string[] = [];
  const resolvedBlocks: AssembledSectionBlockResult[] = [];

  for (const section of enabled) {
    if (
      !userHasPermissions(
        input.userPermissions,
        section.visibility.requiredPermissions,
      )
    ) {
      continue;
    }

    const sectionParts: string[] = [];
    const headerParts: string[] = [];
    if (section.name.trim()) {
      headerParts.push(`## ${section.name.trim()}`);
    }
    if (section.description?.trim()) {
      headerParts.push(section.description.trim());
    }

    for (const [blockIndex, block] of section.blocks.entries()) {
      if (
        section.scope === "perUser" &&
        blockTargetsOtherUserData(block, input.userId)
      ) {
        resolvedBlocks.push({
          sectionId: section.id,
          blockIndex,
          chars: 0,
          ok: false,
          error: "perUser scope: block targets another user",
        });
        continue;
      }

      const resolved = await resolveBlock(input.ports, block);
      resolvedBlocks.push({
        sectionId: section.id,
        blockIndex,
        chars: resolved.text.length,
        ok: resolved.ok,
        ...(resolved.error ? { error: resolved.error } : {}),
      });
      if (resolved.text.trim()) {
        sectionParts.push(resolved.text.trim());
      }
    }

    if (sectionParts.length > 0) {
      parts.push([...headerParts, ...sectionParts].join("\n\n"));
    }
  }

  const text = truncateText(
    parts.join("\n\n"),
    USER_AI_MEMORY_SNAPSHOT_MAX_CHARS,
  );
  const sourceHash = hashSourceValue({
    sections: enabled.map((section) => ({
      id: section.id,
      order: section.order,
      enabled: section.enabled,
      scope: section.scope,
      visibility: section.visibility,
      blocks: section.blocks,
      updatedAt: section.updatedAt,
    })),
    catalogHash: input.catalogHash ?? null,
    text,
  });

  return { text, sourceHash, resolvedBlocks };
}
