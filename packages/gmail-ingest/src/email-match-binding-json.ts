import { z } from "zod";

import {
  createEmailMatchBindingInputSchema,
  type CreateEmailMatchBindingInput,
} from "./types.js";

export const EMAIL_MATCH_BINDING_JSON_VERSION = 1 as const;
export const EMAIL_MATCH_BINDING_JSON_KIND = "email-match-binding" as const;
export const EMAIL_MATCH_BINDINGS_JSON_KIND = "email-match-bindings" as const;

export interface EmailMatchBindingJsonError {
  readonly path: string;
  readonly message: string;
}

type JsonImportResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly errors: readonly EmailMatchBindingJsonError[];
    };

/** Portable binding fields (no id / tenantId / userId / timestamps). */
export const portableEmailMatchBindingSchema =
  createEmailMatchBindingInputSchema;

export type PortableEmailMatchBinding = CreateEmailMatchBindingInput;

export type EmailMatchBindingEnvelope = {
  readonly kind: typeof EMAIL_MATCH_BINDING_JSON_KIND;
  readonly version: typeof EMAIL_MATCH_BINDING_JSON_VERSION;
  readonly data: PortableEmailMatchBinding;
};
export type EmailMatchBindingsEnvelope = {
  readonly kind: typeof EMAIL_MATCH_BINDINGS_JSON_KIND;
  readonly version: typeof EMAIL_MATCH_BINDING_JSON_VERSION;
  readonly exportedAt?: string;
  readonly bindings: readonly PortableEmailMatchBinding[];
};

const emailMatchBindingEnvelopeSchema: z.ZodType<EmailMatchBindingEnvelope> =
  z.object({
    kind: z.literal(EMAIL_MATCH_BINDING_JSON_KIND),
    version: z.literal(EMAIL_MATCH_BINDING_JSON_VERSION),
    data: portableEmailMatchBindingSchema,
  }) as z.ZodType<EmailMatchBindingEnvelope>;

const emailMatchBindingsEnvelopeSchema: z.ZodType<EmailMatchBindingsEnvelope> =
  z.object({
    kind: z.literal(EMAIL_MATCH_BINDINGS_JSON_KIND),
    version: z.literal(EMAIL_MATCH_BINDING_JSON_VERSION),
    exportedAt: z.string().datetime().optional(),
    bindings: z.array(portableEmailMatchBindingSchema).min(1),
  }) as z.ZodType<EmailMatchBindingsEnvelope>;

function zodIssuesToErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): readonly EmailMatchBindingJsonError[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map(String).join(".") : "$",
    message: issue.message,
  }));
}

export function createEmailMatchBindingEnvelope(
  data: PortableEmailMatchBinding,
): EmailMatchBindingEnvelope {
  return {
    kind: EMAIL_MATCH_BINDING_JSON_KIND,
    version: EMAIL_MATCH_BINDING_JSON_VERSION,
    data: portableEmailMatchBindingSchema.parse(data),
  };
}

export function createEmailMatchBindingsEnvelope(
  bindings: readonly PortableEmailMatchBinding[],
  exportedAt: string = new Date().toISOString(),
): EmailMatchBindingsEnvelope {
  return {
    kind: EMAIL_MATCH_BINDINGS_JSON_KIND,
    version: EMAIL_MATCH_BINDING_JSON_VERSION,
    exportedAt,
    bindings: bindings.map((binding) =>
      portableEmailMatchBindingSchema.parse(binding),
    ),
  };
}

export function parseEmailMatchBindingJson(
  text: string,
): JsonImportResult<PortableEmailMatchBinding> {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    return {
      ok: false,
      errors: [{ path: "$", message: "Invalid JSON." }],
    };
  }

  const parsed = emailMatchBindingEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: zodIssuesToErrors(parsed.error) };
  }
  return { ok: true, data: parsed.data.data };
}

export function parseEmailMatchBindingsJson(
  text: string,
): JsonImportResult<readonly PortableEmailMatchBinding[]> {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    return {
      ok: false,
      errors: [{ path: "$", message: "Invalid JSON." }],
    };
  }

  // Accept either a single-binding envelope or a list envelope.
  const single = emailMatchBindingEnvelopeSchema.safeParse(raw);
  if (single.success) {
    return { ok: true, data: [single.data.data] };
  }

  const list = emailMatchBindingsEnvelopeSchema.safeParse(raw);
  if (!list.success) {
    return { ok: false, errors: zodIssuesToErrors(list.error) };
  }
  return { ok: true, data: list.data.bindings };
}

export function toPortableEmailMatchBinding(binding: {
  readonly entityName: string;
  readonly recordId: string;
  readonly enabled?: boolean;
  readonly fromAddresses?: readonly string[];
  readonly subjectPatterns?: readonly string[];
  readonly bodyPatterns?: readonly string[];
  readonly gmailQueryExtra?: string | null;
  readonly useAi?: boolean;
  readonly aiInstructions?: string | null;
  readonly bodyFieldExtractors?: readonly {
    readonly field: string;
    readonly label?: string;
    readonly pattern?: string;
    readonly captureGroup?: number;
    readonly transform?:
      | "trim"
      | "amount"
      | "slashDate"
      | "valueMap"
      | "literal";
    readonly valueMap?: Readonly<Record<string, string>>;
    readonly literal?: string;
  }[];
}): PortableEmailMatchBinding {
  return portableEmailMatchBindingSchema.parse({
    entityName: binding.entityName,
    recordId: binding.recordId,
    ...(binding.enabled !== undefined ? { enabled: binding.enabled } : {}),
    ...(binding.fromAddresses
      ? { fromAddresses: [...binding.fromAddresses] }
      : {}),
    ...(binding.subjectPatterns
      ? { subjectPatterns: [...binding.subjectPatterns] }
      : {}),
    ...(binding.bodyPatterns
      ? { bodyPatterns: [...binding.bodyPatterns] }
      : {}),
    ...(binding.gmailQueryExtra !== undefined
      ? { gmailQueryExtra: binding.gmailQueryExtra }
      : {}),
    ...(binding.useAi !== undefined ? { useAi: binding.useAi } : {}),
    ...(binding.aiInstructions !== undefined
      ? { aiInstructions: binding.aiInstructions }
      : {}),
    ...(binding.bodyFieldExtractors
      ? {
          bodyFieldExtractors: binding.bodyFieldExtractors.map((extractor) => ({
            field: extractor.field,
            label: extractor.label ?? "",
            ...(extractor.pattern ? { pattern: extractor.pattern } : {}),
            ...(extractor.captureGroup !== undefined
              ? { captureGroup: extractor.captureGroup }
              : {}),
            ...(extractor.transform ? { transform: extractor.transform } : {}),
            ...(extractor.valueMap
              ? { valueMap: { ...extractor.valueMap } }
              : {}),
            ...(extractor.literal ? { literal: extractor.literal } : {}),
          })),
        }
      : {}),
  });
}
