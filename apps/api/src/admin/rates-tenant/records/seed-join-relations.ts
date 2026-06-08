import { resolveJoinCollectionName } from "@repo/entities";
import { createFirestoreAdminJoinCollectionRepository } from "@repo/gcp-firebase";

import type { RatesRecordSeedContext } from "../seed-record-helpers.js";

function padId(prefix: string, index: number): string {
  return `${prefix}_${String(index).padStart(2, "0")}`;
}

export async function seedRatesJoinRelations(
  context: RatesRecordSeedContext,
): Promise<void> {
  const joinRepository = createFirestoreAdminJoinCollectionRepository(
    context.config,
  );

  const transactionIncomeJoin = resolveJoinCollectionName(
    "transaction",
    "incomeDetails",
    { target: "incomeDetails", type: "many-to-many" },
  );

  for (let index = 1; index <= 15; index += 1) {
    const transactionId = padId("rd_txn", index);
    const incomeDetailId = padId("rd_incd", ((index - 1) % 5) + 1);
    await joinRepository.link(context.tenantId, {
      joinCollection: transactionIncomeJoin,
      sourceEntity: "transaction",
      sourceId: transactionId,
      targetEntity: "incomeDetails",
      targetId: incomeDetailId,
    });
  }

  const statementTransactionJoin = resolveJoinCollectionName(
    "statement",
    "transaction",
    { target: "transaction", type: "many-to-many" },
  );

  const statementIds = [
    "rd_con_14_stmt_01",
    "rd_con_14_stmt_02",
    "rd_con_15_stmt_01",
  ];
  for (const [statementIndex, statementId] of statementIds.entries()) {
    const baseTxn = statementIndex * 5 + 1;
    for (let offset = 0; offset < 4; offset += 1) {
      const transactionId = padId("rd_txn", baseTxn + offset);
      await joinRepository.link(context.tenantId, {
        joinCollection: statementTransactionJoin,
        sourceEntity: "statement",
        sourceId: statementId,
        targetEntity: "transaction",
        targetId: transactionId,
      });
    }
  }
}
