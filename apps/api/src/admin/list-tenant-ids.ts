import { getFirestoreAdmin, TENANTS_COLLECTION } from "@repo/gcp-firebase";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

function parseKnownTenantIds(raw: string | undefined): readonly string[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((tenantId) => tenantId.trim())
    .filter((tenantId) => tenantId.length > 0);
}

async function listFirestoreTenantIds(
  config: FirebaseAdminConfig,
): Promise<readonly string[]> {
  const snapshot = await getFirestoreAdmin(config)
    .collection(TENANTS_COLLECTION)
    .select()
    .get();

  return snapshot.docs.map((doc) => doc.id);
}

export async function listAvailableTenantIds(params: {
  readonly config: FirebaseAdminConfig;
  readonly isSuperAdmin: boolean;
  readonly userTenantIds: readonly string[];
  readonly knownTenantEnv?: string;
}): Promise<readonly string[]> {
  if (!params.isSuperAdmin) {
    return [...params.userTenantIds];
  }

  const [firestoreTenantIds, envTenantIds] = await Promise.all([
    listFirestoreTenantIds(params.config),
    Promise.resolve(parseKnownTenantIds(params.knownTenantEnv)),
  ]);

  return [
    ...new Set([
      ...params.userTenantIds,
      ...firestoreTenantIds,
      ...envTenantIds,
    ]),
  ];
}
