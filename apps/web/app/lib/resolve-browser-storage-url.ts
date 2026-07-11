import { appConfig } from "../config/app-config";

const INTERNAL_STORAGE_HOST_PATTERN =
  /\/\/(?:firebase-emulator|storage-emulator)(?::\d+)?\//;

function isLocalPublicHost(host: string): boolean {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return (
    hostname === "127.0.0.1" ||
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".localhost")
  );
}

/**
 * Rewrites Storage emulator URLs that use Docker-internal hostnames so the
 * browser can load them (e.g. firebase-emulator:9199 → 127.0.0.1:9199).
 * Non-localhost public hosts (e.g. trycloudflare tunnels) use https to avoid
 * mixed-content blocks on HTTPS pages.
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
  const rewritten = trimmed.replace(
    INTERNAL_STORAGE_HOST_PATTERN,
    `//${publicHost}/`,
  );

  if (!isLocalPublicHost(publicHost) && rewritten.startsWith("http://")) {
    return `https://${rewritten.slice("http://".length)}`;
  }

  return rewritten;
}
