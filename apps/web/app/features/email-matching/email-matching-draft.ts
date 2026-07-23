import type { EmailMatchBindingRecord } from "../../lib/api-client";

export type ExtractorTransform =
  | "trim"
  | "amount"
  | "slashDate"
  | "compactYmd"
  | "monthNameDate"
  | "valueMap"
  | "literal";

/** How the extractor finds a value in the email body (UI exclusivity). */
export type ExtractorSourceMode = "label" | "pattern";

export interface ExtractorFormRow {
  readonly field: string;
  readonly sourceMode: ExtractorSourceMode;
  readonly label: string;
  readonly pattern: string;
  readonly captureGroup: string;
  readonly transform: ExtractorTransform;
  readonly valueMapJson: string;
  readonly literal: string;
  readonly sufficientForRelevance: boolean;
}

export interface AttachmentImportDraft {
  readonly enabled: boolean;
  readonly documentType: string;
  readonly documentDateField: string;
  readonly recordIdField: string;
}

export interface EmailMatchingDraft {
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly order: number;
  readonly ingestMode: "create" | "link";
  readonly catchupNeeded: boolean;
  readonly fromAddresses: string;
  readonly subjectPatterns: string;
  readonly bodyPatterns: string;
  readonly gmailQueryExtra: string;
  readonly useAi: boolean;
  readonly aiInstructions: string;
  readonly bodyFieldExtractors: readonly ExtractorFormRow[];
  readonly attachmentImport: AttachmentImportDraft | null;
}

/**
 * Split newline/comma-separated entries, without breaking commas inside
 * `/regex/flags` patterns (e.g. `{1,2}` quantifiers).
 */
export function splitLines(value: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inSlashRegex = false;
  let escaped = false;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!;

    if (inSlashRegex) {
      current += ch;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === "/") {
        inSlashRegex = false;
        let j = i + 1;
        while (j < value.length && /[a-zA-Z]/.test(value[j]!)) {
          current += value[j]!;
          j += 1;
        }
        i = j - 1;
      }
      continue;
    }

    if (ch === "/" && current.trim().length === 0) {
      inSlashRegex = true;
      current += ch;
      continue;
    }

    if (ch === "\n" || ch === ",") {
      const trimmed = current.trim();
      if (trimmed) {
        parts.push(trimmed);
      }
      current = "";
      continue;
    }

    current += ch;
  }

  const trimmed = current.trim();
  if (trimmed) {
    parts.push(trimmed);
  }
  return parts;
}

export function joinLines(values: readonly string[] | undefined): string {
  return (values ?? []).join("\n");
}

export function inferExtractorSourceMode(input: {
  readonly pattern?: string | null;
}): ExtractorSourceMode {
  return input.pattern?.trim() ? "pattern" : "label";
}

export function emptyExtractorRow(): ExtractorFormRow {
  return {
    field: "",
    sourceMode: "label",
    label: "",
    pattern: "",
    captureGroup: "",
    transform: "trim",
    valueMapJson: "",
    literal: "",
    sufficientForRelevance: false,
  };
}

type ExtractorRecordLike = NonNullable<
  EmailMatchBindingRecord["bodyFieldExtractors"]
>[number];

export function extractorToFormRow(
  extractor: ExtractorRecordLike,
): ExtractorFormRow {
  const pattern = extractor.pattern ?? "";
  return {
    field: extractor.field,
    sourceMode: inferExtractorSourceMode({ pattern }),
    label: extractor.label ?? "",
    pattern,
    captureGroup:
      extractor.captureGroup !== undefined
        ? String(extractor.captureGroup)
        : "",
    transform: extractor.transform ?? "trim",
    valueMapJson: extractor.valueMap
      ? JSON.stringify(extractor.valueMap, null, 2)
      : "",
    literal: extractor.literal ?? "",
    sufficientForRelevance: extractor.sufficientForRelevance ?? false,
  };
}

export function extractorsFromRecord(
  binding: EmailMatchBindingRecord,
): ExtractorFormRow[] {
  return (binding.bodyFieldExtractors ?? []).map(extractorToFormRow);
}

export function extractorsToPayload(
  rows: readonly ExtractorFormRow[],
): NonNullable<EmailMatchBindingRecord["bodyFieldExtractors"]> {
  return rows
    .map((row) => {
      const field = row.field.trim();
      if (!field) {
        return null;
      }
      if (row.transform === "literal") {
        const literal = row.literal.trim();
        if (!literal) {
          return null;
        }
        return {
          field,
          label: "",
          transform: "literal" as const,
          literal,
          ...(row.sufficientForRelevance
            ? { sufficientForRelevance: true }
            : {}),
        };
      }
      const usePattern = row.sourceMode === "pattern";
      const label = usePattern ? "" : row.label.trim();
      const pattern = usePattern ? row.pattern.trim() : "";
      if (!label && !pattern) {
        return null;
      }
      let valueMap: Record<string, string> | undefined;
      if (row.transform === "valueMap" && row.valueMapJson.trim()) {
        try {
          const parsed = JSON.parse(row.valueMapJson) as unknown;
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            valueMap = Object.fromEntries(
              Object.entries(parsed as Record<string, unknown>).map(
                ([key, value]) => [key, String(value)],
              ),
            );
          }
        } catch {
          valueMap = undefined;
        }
      }
      const captureGroupRaw = usePattern ? row.captureGroup.trim() : "";
      const captureGroup =
        captureGroupRaw.length > 0 && /^\d+$/.test(captureGroupRaw)
          ? Number(captureGroupRaw)
          : undefined;
      return {
        field,
        label,
        ...(pattern ? { pattern } : {}),
        ...(captureGroup !== undefined ? { captureGroup } : {}),
        transform: row.transform,
        ...(valueMap ? { valueMap } : {}),
        ...(row.sufficientForRelevance
          ? { sufficientForRelevance: true }
          : {}),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
}

export function buildDraftFromBinding(
  binding: EmailMatchBindingRecord,
): EmailMatchingDraft {
  const attachment = binding.attachmentImport;
  return {
    name: binding.name ?? "",
    description: binding.description ?? "",
    enabled: binding.enabled,
    order: binding.order ?? 100,
    ingestMode: binding.ingestMode ?? "create",
    catchupNeeded: binding.catchupNeeded ?? false,
    fromAddresses: joinLines(binding.fromAddresses),
    subjectPatterns: joinLines(binding.subjectPatterns),
    bodyPatterns: joinLines(binding.bodyPatterns),
    gmailQueryExtra: binding.gmailQueryExtra ?? "",
    useAi: binding.useAi,
    aiInstructions: binding.aiInstructions ?? "",
    bodyFieldExtractors: extractorsFromRecord(binding),
    attachmentImport: attachment
      ? {
          enabled: attachment.enabled,
          documentType: attachment.documentType ?? "",
          documentDateField: attachment.documentDateField ?? "",
          recordIdField: attachment.recordIdField ?? "",
        }
      : null,
  };
}

export function draftToPatchPayload(draft: EmailMatchingDraft): {
  readonly name: string | null;
  readonly description: string | null;
  readonly enabled: boolean;
  readonly order: number;
  readonly ingestMode: "create" | "link";
  readonly catchupNeeded: boolean;
  readonly fromAddresses: readonly string[];
  readonly subjectPatterns: readonly string[];
  readonly bodyPatterns: readonly string[];
  readonly gmailQueryExtra: string | null;
  readonly useAi: boolean;
  readonly aiInstructions: string | null;
  readonly bodyFieldExtractors: EmailMatchBindingRecord["bodyFieldExtractors"];
  readonly attachmentImport: EmailMatchBindingRecord["attachmentImport"];
} {
  const attachment = draft.attachmentImport;
  return {
    name: draft.name.trim() || null,
    description: draft.description.trim() || null,
    enabled: draft.enabled,
    order: draft.order,
    ingestMode: draft.ingestMode,
    catchupNeeded: draft.catchupNeeded,
    fromAddresses: splitLines(draft.fromAddresses),
    subjectPatterns: splitLines(draft.subjectPatterns),
    bodyPatterns: splitLines(draft.bodyPatterns),
    gmailQueryExtra: draft.gmailQueryExtra.trim() || null,
    useAi: draft.useAi,
    aiInstructions: draft.aiInstructions.trim() || null,
    bodyFieldExtractors: extractorsToPayload(draft.bodyFieldExtractors),
    attachmentImport:
      attachment && attachment.enabled && attachment.documentType.trim()
        ? {
            enabled: true,
            documentType: attachment.documentType.trim(),
            ...(attachment.documentDateField.trim()
              ? { documentDateField: attachment.documentDateField.trim() }
              : {}),
            ...(attachment.recordIdField.trim()
              ? { recordIdField: attachment.recordIdField.trim() }
              : {}),
          }
        : attachment && !attachment.enabled
          ? null
          : null,
  };
}

export function bindingDisplayName(binding: EmailMatchBindingRecord): string {
  const name = binding.name?.trim();
  if (name) return name;
  if (binding.fromAddresses.length > 0) {
    return binding.fromAddresses.join(", ");
  }
  return binding.id;
}

export function isDraftDirty(
  draft: EmailMatchingDraft,
  binding: EmailMatchBindingRecord,
): boolean {
  return (
    JSON.stringify(draft) !== JSON.stringify(buildDraftFromBinding(binding))
  );
}
