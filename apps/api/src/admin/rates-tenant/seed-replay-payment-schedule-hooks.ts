import type { EntityDefinitionRecord } from "@repo/dynamic-entities";
import {
  createFirestoreAdminPlatformRuntimeSettingsRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import { resolveSeedHookObservabilityEnabled } from "@repo/debug-logs";

import {
  createSeedHookRunner,
  type SeedHookRunner,
} from "./seed-hook-runner.js";
import {
  createRatesRecordSeedContext,
  createSeedHookEntityRuntime,
  loadRatesSeedRecord,
  type RatesRecordSeedContext,
} from "./seed-record-helpers.js";

const DEFAULT_SEED_HOOK_REPLAY_CONCURRENCY = 4;

export interface SeedPaymentScheduleHookTarget {
  readonly loanDetails: readonly {
    readonly id: string;
    readonly financialItemId: string;
    readonly record?: Record<string, unknown>;
  }[];
  readonly financialItemIds: readonly string[];
  readonly financialItemRecords?: ReadonlyMap<string, Record<string, unknown>>;
}

function resolveSeedHookReplayConcurrency(): number {
  const fromEnv = Number(process.env.SEED_HOOK_REPLAY_CONCURRENCY);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return Math.floor(fromEnv);
  }
  return DEFAULT_SEED_HOOK_REPLAY_CONCURRENCY;
}

async function mapWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  let nextIndex = 0;
  const poolSize = Math.min(Math.max(1, concurrency), items.length);

  await Promise.all(
    Array.from({ length: poolSize }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        await worker(items[currentIndex]!);
      }
    }),
  );
}

export async function replaySeedPaymentScheduleHooks(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  definitionRecords: readonly EntityDefinitionRecord[],
  ownerId: string,
  targets: SeedPaymentScheduleHookTarget,
): Promise<void> {
  if (
    targets.loanDetails.length === 0 &&
    targets.financialItemIds.length === 0
  ) {
    return;
  }

  const context = createRatesRecordSeedContext(
    tenantId,
    firebaseAdminConfig,
    definitionRecords,
    ownerId,
  );

  const platformRuntimeSettings =
    await createFirestoreAdminPlatformRuntimeSettingsRepository(
      firebaseAdminConfig,
    ).get();
  const observabilityEnabled = resolveSeedHookObservabilityEnabled(
    platformRuntimeSettings,
  );
  console.log(
    `[seed] Hook observability: ${observabilityEnabled ? "enabled" : "disabled"}`,
  );

  const hookRunner = await createSeedHookRunner({
    tenantId,
    ownerUserId: ownerId,
    firebaseAdminConfig,
    entityRuntime: createSeedHookEntityRuntime(context),
    observabilityEnabled,
  });

  const loanLinkedFinancialItemIds = new Set(
    targets.loanDetails.map((row) => row.financialItemId),
  );
  const financialItemRecords = targets.financialItemRecords;
  const concurrency = resolveSeedHookReplayConcurrency();

  console.log("[seed] Replaying paymentSchedule hooks for imported records...");

  await mapWithConcurrency(
    targets.loanDetails,
    concurrency,
    async (loanDetails) => {
      await replayAfterCreate(
        context,
        hookRunner,
        "loanDetails",
        loanDetails.id,
        loanDetails.record,
      );
    },
  );

  const financialItemTargets = targets.financialItemIds.filter(
    (financialItemId) => !loanLinkedFinancialItemIds.has(financialItemId),
  );

  await mapWithConcurrency(
    financialItemTargets,
    concurrency,
    async (financialItemId) => {
      await replayAfterCreate(
        context,
        hookRunner,
        "financialItem",
        financialItemId,
        financialItemRecords?.get(financialItemId),
      );
    },
  );

  console.log("[seed] PaymentSchedule hook replay complete.");
}

async function replayAfterCreate(
  context: RatesRecordSeedContext,
  hookRunner: SeedHookRunner,
  entityName: string,
  recordId: string,
  record?: Record<string, unknown>,
): Promise<void> {
  const resolvedRecord =
    record ?? (await loadRatesSeedRecord(context, entityName, recordId));
  if (!resolvedRecord) {
    console.warn(
      `[seed] Skipping hook replay for missing ${entityName} record "${recordId}".`,
    );
    return;
  }

  await hookRunner.runAfterCreateHooks(entityName, resolvedRecord);
}
