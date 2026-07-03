import { existsSync } from "node:fs";
import { connect } from "node:net";

import { createFirestoreAdminEntityDefinitionRepository } from "@repo/gcp-firebase";

import { seedPlatformRoles } from "../admin/seed-platform-roles.js";
import { seedPlatformTenants } from "../admin/seed-platform-tenants.js";
import { RATES_TENANT_ID } from "../admin/rates-tenant/constants.js";
import { apiEnv } from "../config/env.js";
import { createEntityRuntimeContext } from "../entities/entity-runtime-context.js";
import { isDevHookCacheReloadEnabled } from "../dev/reload-hook-cache.route.js";

function isInsideDocker(): boolean {
  return existsSync("/.dockerenv");
}

/** Map Compose service names to localhost when seeding from the host machine. */
function normalizeEmulatorHost(
  host: string | undefined,
  serviceName: string,
): string | undefined {
  if (!host || isInsideDocker()) {
    return host;
  }
  const prefix = `${serviceName}:`;
  if (host.startsWith(prefix)) {
    return host.replace(prefix, "127.0.0.1:");
  }
  return host;
}

function normalizeServiceUrl(url: string, serviceName: string): string {
  if (isInsideDocker()) {
    return url;
  }
  return url.replace(`${serviceName}:`, "127.0.0.1:");
}

function buildFirebaseAdminConfig() {
  const firestoreEmulatorHost = normalizeEmulatorHost(
    apiEnv.FIRESTORE_EMULATOR_HOST,
    "firebase-emulator",
  );
  const authEmulatorHost = normalizeEmulatorHost(
    apiEnv.FIREBASE_AUTH_EMULATOR_HOST,
    "firebase-emulator",
  );
  const storageEmulatorHost = normalizeEmulatorHost(
    apiEnv.FIREBASE_STORAGE_EMULATOR_HOST,
    "firebase-emulator",
  );

  return {
    projectId: apiEnv.GCP_PROJECT_ID,
    authEmulatorHost,
    firestoreEmulatorHost,
    storageEmulatorHost,
    storageEmulatorPublicHost: apiEnv.FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST,
    storageBucket: apiEnv.GCP_STORAGE_BUCKET,
  };
}

async function assertTcpReachable(
  hostPort: string | undefined,
  label: string,
): Promise<void> {
  if (!hostPort?.trim()) {
    return;
  }

  const [host, portText] = hostPort.split(":");
  const port = Number(portText);
  if (!host || !Number.isFinite(port)) {
    throw new Error(`Invalid ${label} address: "${hostPort}"`);
  }

  await new Promise<void>((resolve, reject) => {
    const socket = connect({ host, port, timeout: 3_000 });
    socket.once("connect", () => {
      socket.end();
      resolve();
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("timed out after 3s"));
    });
    socket.once("error", (error) => {
      socket.destroy();
      reject(error);
    });
  }).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Cannot reach ${label} at ${hostPort} (${reason}). ` +
        "Start emulators first (pnpm dev:docker or pnpm emulators), then run pnpm seed:database.",
    );
  });
}

async function reloadHookCachesForTenants(
  tenantIds: readonly string[],
): Promise<void> {
  if (!isDevHookCacheReloadEnabled()) {
    return;
  }

  const apiBaseUrl = `http://127.0.0.1:${apiEnv.API_PORT}`;
  const workerBaseUrl = normalizeServiceUrl(
    apiEnv.WORKER_SERVICE_URL,
    "worker-service",
  );

  for (const tenantId of tenantIds) {
    const body = JSON.stringify({ tenantId });
    for (const [label, baseUrl] of [
      ["API", apiBaseUrl],
      ["worker", workerBaseUrl],
    ] as const) {
      try {
        const response = await fetch(`${baseUrl}/dev/reload-hook-cache`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: AbortSignal.timeout(5_000),
        });
        if (!response.ok) {
          console.warn(
            `[seed] ${label} hook cache reload failed for tenant ${tenantId}: HTTP ${response.status}`,
          );
        }
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(
          `[seed] ${label} hook cache reload unreachable for tenant ${tenantId}: ${reason}`,
        );
      }
    }
  }
}

export async function runDatabaseSeed(): Promise<void> {
  const firebaseAdminConfig = buildFirebaseAdminConfig();

  console.log("[seed] Project:", firebaseAdminConfig.projectId);
  if (firebaseAdminConfig.firestoreEmulatorHost) {
    console.log(
      "[seed] Firestore emulator:",
      firebaseAdminConfig.firestoreEmulatorHost,
    );
    await assertTcpReachable(
      firebaseAdminConfig.firestoreEmulatorHost,
      "Firestore emulator",
    );
  }
  if (firebaseAdminConfig.authEmulatorHost) {
    console.log("[seed] Auth emulator:", firebaseAdminConfig.authEmulatorHost);
    await assertTcpReachable(
      firebaseAdminConfig.authEmulatorHost,
      "Auth emulator",
    );
  }

  const entityDefinitionRepository =
    createFirestoreAdminEntityDefinitionRepository(firebaseAdminConfig);
  const entityRuntime = createEntityRuntimeContext({
    firebaseAdminConfig,
    entityDefinitionRepository,
    definitionCacheTtlMs: apiEnv.CACHE_TTL_MS,
    cursorSecret: apiEnv.QUERY_CURSOR_SECRET,
    clientFallbackMaxDocs: apiEnv.CLIENT_QUERY_FALLBACK_MAX_DOCS,
    ensureFirestoreIndexes: false,
    indexProvisioningExcludedTenants: new Set([RATES_TENANT_ID]),
  });

  console.log("[seed] Seeding platform roles...");
  await seedPlatformRoles(firebaseAdminConfig);

  console.log(
    "[seed] Seeding platform tenants (rates catalog + per-user dev data)...",
  );
  await seedPlatformTenants(firebaseAdminConfig, entityRuntime);

  await reloadHookCachesForTenants([RATES_TENANT_ID]);

  console.log("[seed] Database seed complete.");
}

async function main(): Promise<void> {
  await runDatabaseSeed();
  process.exit(0);
}

void main().catch((error) => {
  console.error("[seed] Failed:", error);
  process.exit(1);
});
