import type { EntityDefinitionRecord } from "@repo/dynamic-entities";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import type { EntityRuntimeContext } from "../../entities/entity-runtime-context.js";
import {
  createSeedHookRunner,
  type SeedHookRunner,
} from "./seed-hook-runner.js";
import {
  createRatesRecordSeedContext,
  loadRatesSeedRecord,
  type RatesRecordSeedContext,
} from "./seed-record-helpers.js";

export interface SeedPaymentScheduleHookTarget {
  readonly loanDetails: readonly {
    readonly id: string;
    readonly financialItemId: string;
  }[];
  readonly financialItemIds: readonly string[];
}

export async function replaySeedPaymentScheduleHooks(
  tenantId: string,
  firebaseAdminConfig: FirebaseAdminConfig,
  definitionRecords: readonly EntityDefinitionRecord[],
  ownerId: string,
  entityRuntime: EntityRuntimeContext,
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
  const hookRunner = await createSeedHookRunner({
    tenantId,
    ownerUserId: ownerId,
    firebaseAdminConfig,
    entityRuntime,
  });

  const loanLinkedFinancialItemIds = new Set(
    targets.loanDetails.map((row) => row.financialItemId),
  );

  console.log("[seed] Replaying paymentSchedule hooks for imported records...");

  for (const loanDetails of targets.loanDetails) {
    await replayAfterCreate(context, hookRunner, "loanDetails", loanDetails.id);
  }

  for (const financialItemId of targets.financialItemIds) {
    if (loanLinkedFinancialItemIds.has(financialItemId)) {
      continue;
    }
    await replayAfterCreate(
      context,
      hookRunner,
      "financialItem",
      financialItemId,
    );
  }

  console.log("[seed] PaymentSchedule hook replay complete.");
}

async function replayAfterCreate(
  context: RatesRecordSeedContext,
  hookRunner: SeedHookRunner,
  entityName: string,
  recordId: string,
): Promise<void> {
  const record = await loadRatesSeedRecord(context, entityName, recordId);
  if (!record) {
    console.warn(
      `[seed] Skipping hook replay for missing ${entityName} record "${recordId}".`,
    );
    return;
  }

  await hookRunner.runAfterCreateHooks(entityName, record);
}
