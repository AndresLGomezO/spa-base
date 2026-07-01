import type {
  PlatformRuntimeSettings,
  UpdatePlatformRuntimeSettingsInput,
} from "@repo/debug-logs";

export interface PlatformRuntimeSettingsRepository {
  get(): Promise<PlatformRuntimeSettings | null>;
  update(
    input: UpdatePlatformRuntimeSettingsInput & {
      readonly updatedBy: string;
    },
  ): Promise<PlatformRuntimeSettings>;
}
