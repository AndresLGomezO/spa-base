import { z } from "zod";

export const PLATFORM_RUNTIME_SETTINGS_COLLECTION = "platform";
export const PLATFORM_RUNTIME_SETTINGS_DOC_ID = "runtimeSettings";

export const platformRuntimeSettingsSchema = z
  .object({
    aiStepTraceEnabled: z.boolean().nullable(),
    requestPerfTraceEnabled: z.boolean().nullable(),
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
  })
  .strict()
  .refine(
    (value) =>
      value.aiStepTraceEnabled !== undefined ||
      value.requestPerfTraceEnabled !== undefined,
    { message: "At least one setting must be provided." },
  );

export type UpdatePlatformRuntimeSettingsInput = z.infer<
  typeof updatePlatformRuntimeSettingsInputSchema
>;

export interface ObservabilityEnvDefaults {
  readonly aiStepTraceEnabled: boolean;
  readonly requestPerfTraceEnabled: boolean;
}

export interface EffectiveObservabilityFlags {
  readonly aiStepTraceEnabled: boolean;
  readonly requestPerfTraceEnabled: boolean;
}
