import type { DocumentExtractionTemplateRepository } from "@repo/ai-context";
import {
  createHookEntityServices,
  type HookEntityServices,
  type HookLogger,
} from "@repo/hooks";
import { createHookEntityAccessControl } from "@repo/rbac";

import type { EntityRuntimeForCrudHooks } from "../hooks/crud-hook-deps.types.js";
import { dispatchChainedEntityHooks } from "../hooks/dispatch-chained-entity-hooks.js";
import type { HookRuntimeContext } from "../hooks/hook-runtime-context.js";
import type { ApplyStatementExtractionFn } from "./register-statement-extraction-routes.js";

interface ApplyStatementExtractionDeps {
  readonly entityRuntime: EntityRuntimeForCrudHooks;
  readonly documentExtractionTemplateRepository: DocumentExtractionTemplateRepository;
  readonly hookRuntime?: HookRuntimeContext;
  readonly logger?: HookLogger;
  /**
   * Optional confirm-hook runner. Platform apply already writes statement /
   * transactions / balanceSnapshot; this is for future email-style flows keyed
   * by template.onConfirmHookId.
   */
  readonly runConfirmHook?: (
    tenantId: string,
    hookId: string,
    context: Record<string, unknown>,
  ) => Promise<void>;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function asOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asDateString(value: unknown): string | undefined {
  const raw = asOptionalString(value);
  if (!raw) return undefined;
  // Accept YYYY-MM-DD or ISO timestamps; normalize to date prefix when possible.
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? raw;
}

function monthFromDate(date: string): string {
  return date.slice(0, 7);
}

function defaultLogger(): HookLogger {
  return {
    info(message, meta) {
      console.info(message, meta ?? {});
    },
    error(message, meta) {
      console.error(message, meta ?? {});
    },
  };
}

function buildEntityServices(
  deps: ApplyStatementExtractionDeps,
  tenantId: string,
  userId: string,
): HookEntityServices {
  const logger = deps.logger ?? defaultLogger();
  const services: HookEntityServices = createHookEntityServices({
    entityRuntime: deps.entityRuntime,
    accessControl: createHookEntityAccessControl({
      permissions: [],
      isSuperAdmin: true,
      tenantId,
      roleCatalog: {},
      knownPermissions: [],
      platformRole: null,
      tenantRoleNames: [],
    }),
    tenantId,
    ownerUserId: userId,
    dispatchChainedHooks: (params) =>
      dispatchChainedEntityHooks({
        tenantId,
        entityName: params.entityName,
        phase: params.phase,
        operation: params.operation,
        current: params.current,
        ...(params.previous ? { previous: params.previous } : {}),
        depth: params.depth,
        visitedHookIds: params.visitedHookIds,
        user: { uid: userId },
        logger,
        entityServices: services,
      }),
  });
  return services;
}

/**
 * Platform apply for statement AI extraction (v1):
 * - Writes statement (+ source=documentExtract), transactions, balanceSnapshot
 * - Links attachment.statementId
 * - Optionally updates financialItem / account last4 + encrypted product numbers
 * - Tenant CRUD hooks on statement.create may patch payment schedules
 * - Rate / replan math stays in formula-definitions; confirm hooks are optional
 */
export function createApplyStatementExtraction(
  deps: ApplyStatementExtractionDeps,
): ApplyStatementExtractionFn {
  return async (tenantId, userId, extraction, decryptedPayload) => {
    if (deps.hookRuntime) {
      await deps.hookRuntime.ensureTenantHooksLoaded(tenantId);
    }

    const fields = decryptedPayload;
    const financialItemId =
      asOptionalString(extraction.financialItemId) ??
      asOptionalString(fields.financialItemId);
    const accountId =
      asOptionalString(extraction.accountId) ??
      asOptionalString(fields.accountId);

    if (!financialItemId) {
      throw new Error(
        "Cannot apply statement extraction without financialItemId on the extraction or payload.",
      );
    }

    const statementDate =
      asDateString(fields.statementDate) ??
      asDateString(fields.periodEnd) ??
      new Date().toISOString().slice(0, 10);
    const periodEnd = asDateString(fields.periodEnd) ?? statementDate;
    const periodStart = asDateString(fields.periodStart);
    const currency =
      asOptionalString(fields.currency)?.toUpperCase() === "USD"
        ? "USD"
        : "COP";

    const template =
      extraction.templateId != null
        ? await deps.documentExtractionTemplateRepository.get(
            tenantId,
            extraction.templateId,
          )
        : null;

    const services = buildEntityServices(deps, tenantId, userId);

    const statementData: Record<string, unknown> = {
      name: `Statement ${statementDate}`,
      financialItemId,
      periodEnd,
      statementDate,
      currency,
      status: "applied",
      source: "documentExtract",
      ...(accountId ? { accountId } : {}),
      ...(periodStart ? { periodStart } : {}),
      ...(asOptionalNumber(fields.closingBalance) !== undefined
        ? { closingBalance: asOptionalNumber(fields.closingBalance) }
        : {}),
      ...(asOptionalNumber(fields.minPayment) !== undefined
        ? { minPayment: asOptionalNumber(fields.minPayment) }
        : {}),
      ...(asDateString(fields.paymentDueDate)
        ? { paymentDueDate: asDateString(fields.paymentDueDate) }
        : {}),
      ...(asOptionalNumber(fields.interestCharged) !== undefined
        ? { interestCharged: asOptionalNumber(fields.interestCharged) }
        : {}),
      ...(asOptionalNumber(fields.feesCharged) !== undefined
        ? { feesCharged: asOptionalNumber(fields.feesCharged) }
        : {}),
      ...(asOptionalNumber(fields.purchasesTotal) !== undefined
        ? { purchasesTotal: asOptionalNumber(fields.purchasesTotal) }
        : {}),
      ...(asOptionalNumber(fields.paymentsTotal) !== undefined
        ? { paymentsTotal: asOptionalNumber(fields.paymentsTotal) }
        : {}),
    };

    const statement = await services.create("statement", statementData, {
      chainHooks: true,
    });
    const statementId = String(statement.id);

    const transactions = Array.isArray(fields.transactions)
      ? fields.transactions
      : [];
    for (const raw of transactions) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const txn = raw as Record<string, unknown>;
      const date = asDateString(txn.date);
      const amount = asOptionalNumber(txn.amount);
      const description = asOptionalString(txn.description) ?? "";
      if (!date || amount === undefined) continue;

      const type = asOptionalString(txn.type)?.toUpperCase() ?? "EXPENSE";

      await services.create(
        "transaction",
        {
          type,
          amount,
          date,
          month: monthFromDate(date),
          description,
          financialItemId,
          statementId,
          ...(accountId ? { accountId } : {}),
          ...(asOptionalNumber(txn.installmentIndex) !== undefined
            ? { installmentIndex: asOptionalNumber(txn.installmentIndex) }
            : {}),
          ...(asOptionalNumber(txn.installmentTotal) !== undefined
            ? { installmentTotal: asOptionalNumber(txn.installmentTotal) }
            : {}),
          ...(asOptionalNumber(txn.interestPortion) !== undefined
            ? { interestPortion: asOptionalNumber(txn.interestPortion) }
            : {}),
          ...(asOptionalNumber(txn.principalPortion) !== undefined
            ? { principalPortion: asOptionalNumber(txn.principalPortion) }
            : {}),
        },
        { chainHooks: true },
      );
    }

    const closingBalance = asOptionalNumber(fields.closingBalance);
    if (closingBalance !== undefined) {
      await services.create(
        "balanceSnapshot",
        {
          financialItemId,
          date: periodEnd,
          balance: closingBalance,
          statementId,
          ...(asOptionalNumber(fields.interestCharged) !== undefined
            ? { accruedInterest: asOptionalNumber(fields.interestCharged) }
            : {}),
        },
        { chainHooks: true },
      );

      await services.update(
        "financialItem",
        financialItemId,
        { currentBalance: closingBalance },
        { chainHooks: true },
      );
    }

    await services.update(
      "attachment",
      extraction.attachmentId,
      { statementId },
      { chainHooks: true },
    );

    const productNumberLast4 =
      asOptionalString(fields.productNumberLast4) ??
      asOptionalString(fields.accountNumberLast4);
    const productNumberEncrypted = asOptionalString(
      fields.productNumberEncrypted,
    );
    if (productNumberLast4 || productNumberEncrypted) {
      await services.update(
        "financialItem",
        financialItemId,
        {
          ...(productNumberLast4 ? { productNumberLast4 } : {}),
          ...(productNumberEncrypted ? { productNumberEncrypted } : {}),
        },
        { chainHooks: true },
      );
    }

    const accountNumberLast4 = asOptionalString(fields.accountNumberLast4);
    const accountNumberEncrypted = asOptionalString(
      fields.accountNumberEncrypted,
    );
    if (accountId && (accountNumberLast4 || accountNumberEncrypted)) {
      await services.update(
        "account",
        accountId,
        {
          ...(accountNumberLast4 ? { accountNumberLast4 } : {}),
          ...(accountNumberEncrypted ? { accountNumberEncrypted } : {}),
        },
        { chainHooks: true },
      );
    }

    const onConfirmHookId = template?.onConfirmHookId;
    if (onConfirmHookId && deps.runConfirmHook) {
      await deps.runConfirmHook(tenantId, onConfirmHookId, {
        extractionId: extraction.id,
        attachmentId: extraction.attachmentId,
        statementId,
        templateId: template?.id,
        __extracted: { fields: decryptedPayload },
        requestedBy: userId,
      });
    }
  };
}
