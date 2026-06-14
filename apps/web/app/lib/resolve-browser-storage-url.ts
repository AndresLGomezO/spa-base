import { appConfig } from "../config/app-config";

const INTERNAL_STORAGE_HOST_PATTERN =
  /\/\/(?:firebase-emulator|storage-emulator)(?::\d+)?\//;

/**
 * Rewrites Storage emulator URLs that use Docker-internal hostnames so the
 * browser can load them (e.g. firebase-emulator:9199 → 127.0.0.1:9199).
 */
export function resolveBrowserStorageUrl(
  url: string | undefined | null,
): string | undefined {
  if (!url?.trim()) {
    return undefined;
  }

  const trimmed = url.trim();
  if (!INTERNAL_STORAGE_HOST_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const publicHost =
    appConfig.firebase.storageEmulatorPublicHost.trim() || "127.0.0.1:9199";
  return trimmed.replace(INTERNAL_STORAGE_HOST_PATTERN, `//${publicHost}/`);
}
