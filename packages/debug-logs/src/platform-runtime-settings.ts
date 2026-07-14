import { z } from "zod";

export const gmailIngestDeliveryModeSchema = z.enum(["poll", "push"]);
export type GmailIngestDeliveryMode = z.infer<
  typeof gmailIngestDeliveryModeSchema
>;

export const PLATFORM_RUNTIME_SETTINGS_COLLECTION = "platform";
export const PLATFORM_RUNTIME_SETTINGS_DOC_ID = "runtimeSettings";

export const platformRuntimeSettingsSchema = z
  .object({
    aiStepTraceEnabled: z.boolean().nullable(),
    requestPerfTraceEnabled: z.boolean().nullable(),
    seedHookObservabilityEnabled: z.boolean().nullable(),
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
    aiStepTraceEnabled: z.boolean().nullable().optional(),
    requestPerfTraceEnabled: z.boolean().nullable().optional(),
    seedHookObservabilityEnabled: z.boolean().nullable().optional(),
    gmailIngestDeliveryMode: gmailIngestDeliveryModeSchema
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.aiStepTraceEnabled !== undefined ||
      value.requestPerfTraceEnabled !== undefined ||
      value.seedHookObservabilityEnabled !== undefined ||
      value.gmailIngestDeliveryMode !== undefined,
    { message: "At least one setting must be provided." },
  );

export type UpdatePlatformRuntimeSettingsInput = z.infer<
  typeof updatePlatformRuntimeSettingsInputSchema
>;

export interface ObservabilityEnvDefaults {
  readonly aiStepTraceEnabled: boolean;
  readonly requestPerfTraceEnabled: boolean;
  readonly seedHookObservabilityEnabled: boolean;
  readonly gmailIngestDeliveryMode: GmailIngestDeliveryMode;
}

export interface EffectiveObservabilityFlags {
  readonly aiStepTraceEnabled: boolean;
  readonly requestPerfTraceEnabled: boolean;
  readonly seedHookObservabilityEnabled: boolean;
  readonly gmailIngestDeliveryMode: GmailIngestDeliveryMode;
}
