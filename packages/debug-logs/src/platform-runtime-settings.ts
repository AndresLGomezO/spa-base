import { z } from "zod";

export const gmailIngestDeliveryModeSchema = z.enum(["poll", "push"]);
export type GmailIngestDeliveryMode = z.infer<
  typeof gmailIngestDeliveryModeSchema
>;

export const PLATFORM_RUNTIME_SETTINGS_COLLECTION = "platform";
export const PLATFORM_RUNTIME_SETTINGS_DOC_ID = "runtimeSettings";

export const platformRuntimeSettingsSchema = z
  .object({
    /** Global AI kill-switch. null = use env AI_ENABLED (default true). */
    aiEnabled: z.boolean().nullable().default(null),
    /**
     * Persist full prompt/output stepTrace on ai_jobs.
     * Prefer aiTraceEnabled; aiStepTraceEnabled kept for back-compat.
     */
    aiTraceEnabled: z.boolean().nullable().default(null),
    aiStepTraceEnabled: z.boolean().nullable().default(null),
    requestPerfTraceEnabled: z.boolean().nullable().default(null),
    seedHookObservabilityEnabled: z.boolean().nullable().default(null),
    /**
     * Explicit Vertex CachedContent for data-hook classify catalogs.
     * null = use env DATA_HOOK_AI_CACHE_ENABLED (default on in prod, off in test).
     */
    dataHookAiCacheEnabled: z.boolean().nullable().default(null),
    /** null = use env GMAIL_INGEST_DELIVERY_MODE */
    gmailIngestDeliveryMode: gmailIngestDeliveryModeSchema
      .nullable()
      .default(null),
    updatedAt: z.string().trim().min(1),
    updatedBy: z.string().trim().min(1),
  })
  .strict();

export type PlatformRuntimeSettings = z.infer<
  typeof platformRuntimeSettingsSchema
>;

export const updatePlatformRuntimeSettingsInputSchema = z
  .object({
    aiEnabled: z.boolean().nullable().optional(),
    aiTraceEnabled: z.boolean().nullable().optional(),
    aiStepTraceEnabled: z.boolean().nullable().optional(),
    requestPerfTraceEnabled: z.boolean().nullable().optional(),
    seedHookObservabilityEnabled: z.boolean().nullable().optional(),
    dataHookAiCacheEnabled: z.boolean().nullable().optional(),
    gmailIngestDeliveryMode: gmailIngestDeliveryModeSchema
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.aiEnabled !== undefined ||
      value.aiTraceEnabled !== undefined ||
      value.aiStepTraceEnabled !== undefined ||
      value.requestPerfTraceEnabled !== undefined ||
      value.seedHookObservabilityEnabled !== undefined ||
      value.dataHookAiCacheEnabled !== undefined ||
      value.gmailIngestDeliveryMode !== undefined,
    { message: "At least one setting must be provided." },
  );

export type UpdatePlatformRuntimeSettingsInput = z.infer<
  typeof updatePlatformRuntimeSettingsInputSchema
>;

export interface ObservabilityEnvDefaults {
  readonly aiEnabled: boolean;
  readonly aiTraceEnabled: boolean;
  /** @deprecated alias of aiTraceEnabled */
  readonly aiStepTraceEnabled: boolean;
  readonly requestPerfTraceEnabled: boolean;
  readonly seedHookObservabilityEnabled: boolean;
  readonly dataHookAiCacheEnabled: boolean;
  readonly gmailIngestDeliveryMode: GmailIngestDeliveryMode;
}

export interface EffectiveObservabilityFlags {
  readonly aiEnabled: boolean;
  readonly aiTraceEnabled: boolean;
  /** @deprecated alias of aiTraceEnabled */
  readonly aiStepTraceEnabled: boolean;
  readonly requestPerfTraceEnabled: boolean;
  readonly seedHookObservabilityEnabled: boolean;
  readonly dataHookAiCacheEnabled: boolean;
  readonly gmailIngestDeliveryMode: GmailIngestDeliveryMode;
}
