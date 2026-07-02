import type { CreateIndexProvisionEventInput } from "@repo/debug-logs";
import type { IndexProvisionEventRepository } from "@repo/firestore-converters";
import { computeIndexSignature } from "@repo/firestore-indexes";
import type { FirestoreCompositeIndex } from "@repo/firestore-indexes";

const PLATFORM_TENANT_KEY = "__platform__";
const OPERATION_BLOCKED_COOLDOWN_MS = 60_000;
const recentOperationBlockedKeys = new Map<string, number>();

function shouldPersistOperationBlocked(
  input: CreateIndexProvisionEventInput,
): boolean {
  if (input.event !== "operation_blocked") {
    return true;
  }

  const key = [
    input.tenantId ?? PLATFORM_TENANT_KEY,
    input.collection,
    input.blockedOperation ?? "list_query",
  ].join("|");
  const now = Date.now();
  const lastRecordedAt = recentOperationBlockedKeys.get(key);
  if (
    lastRecordedAt !== undefined &&
    now - lastRecordedAt < OPERATION_BLOCKED_COOLDOWN_MS
  ) {
    return false;
  }

  recentOperationBlockedKeys.set(key, now);
  return true;
}

export function createIndexProvisionEventWriter(
  repository: IndexProvisionEventRepository | undefined,
): (input: CreateIndexProvisionEventInput) => Promise<void> {
  return async (input) => {
    if (!repository || !shouldPersistOperationBlocked(input)) {
      return;
    }
    const tenantId = input.tenantId ?? PLATFORM_TENANT_KEY;
    await repository.create(
      tenantId === PLATFORM_TENANT_KEY ? undefined : tenantId,
      input,
    );
  };
}

export function indexProvisionEventFromCompositeIndex(
  index: FirestoreCompositeIndex,
  event: CreateIndexProvisionEventInput["event"],
  extra?: Partial<CreateIndexProvisionEventInput>,
): CreateIndexProvisionEventInput {
  return {
    timestamp: new Date().toISOString(),
    event,
    collection: index.collectionGroup,
    signature: computeIndexSignature(index),
    fields: index.fields as unknown as CreateIndexProvisionEventInput["fields"],
    ...extra,
  };
}
