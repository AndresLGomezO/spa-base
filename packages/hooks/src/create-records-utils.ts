import type {
  DataHookExecutionMode,
  DataHookPhase,
} from "./data-hook-definition.js";
import {
  MAX_CREATE_RECORDS,
  MAX_CREATE_RECORDS_QUEUED,
} from "./data-hook-definition.js";
import type { ExpressionNode } from "./expression.js";
import { HookExecutionError } from "./types.js";

export function extractLiteralInteger(node: ExpressionNode): number | null {
  if (node.kind !== "literal" || typeof node.value !== "number") {
    return null;
  }
  return Math.trunc(node.value);
}

export function resolveMaxCreateRecords(
  phase: DataHookPhase,
  execution?: DataHookExecutionMode,
): number {
  if (phase === "after" && execution === "queued") {
    return MAX_CREATE_RECORDS_QUEUED;
  }
  return MAX_CREATE_RECORDS;
}

export function validateCreateRecordsLiteralCount(
  countNode: ExpressionNode,
  phase: DataHookPhase,
  execution?: DataHookExecutionMode,
  startIndexNode?: ExpressionNode,
): void {
  const literalCount = extractLiteralInteger(countNode);
  if (literalCount === null) {
    return;
  }

  if (literalCount < 0) {
    throw new HookExecutionError(
      "createRecords count literal must be a non-negative integer.",
    );
  }

  if (literalCount > MAX_CREATE_RECORDS_QUEUED) {
    throw new HookExecutionError(
      `createRecords count (${literalCount}) exceeds the hard maximum of ${MAX_CREATE_RECORDS_QUEUED}. Use a rolling horizon with scheduled extension hooks instead.`,
    );
  }

  const tierLimit = resolveMaxCreateRecords(phase, execution);
  if (literalCount > tierLimit) {
    if (phase === "after" && execution !== "queued") {
      throw new HookExecutionError(
        `createRecords count (${literalCount}) exceeds the maximum of ${MAX_CREATE_RECORDS} for ${execution ?? "sync"} after hooks. Use execution: "queued" for up to ${MAX_CREATE_RECORDS_QUEUED}, or split with a rolling horizon pattern.`,
      );
    }
    throw new HookExecutionError(
      `createRecords count (${literalCount}) exceeds the maximum of ${tierLimit} for ${phase} phase hooks. Use a rolling horizon with scheduled extension hooks instead.`,
    );
  }

  if (startIndexNode) {
    const literalStartIndex = extractLiteralInteger(startIndexNode);
    if (literalStartIndex !== null && literalStartIndex < 0) {
      throw new HookExecutionError(
        "createRecords startIndex literal must be a non-negative integer.",
      );
    }
  }
}

export function assertCreateRecordsRuntimeCount(
  count: number,
  phase: DataHookPhase,
  execution?: DataHookExecutionMode,
): void {
  if (count < 0) {
    throw new HookExecutionError(
      "createRecords count must be a non-negative number.",
    );
  }

  const tierLimit = resolveMaxCreateRecords(phase, execution);
  if (count > tierLimit) {
    throw new HookExecutionError(
      `createRecords count (${count}) exceeds the maximum of ${tierLimit}. Use execution: "queued" for larger batches (up to ${MAX_CREATE_RECORDS_QUEUED}), or split with a rolling horizon pattern using startIndex and scheduled hooks.`,
    );
  }
}

export function coerceNonNegativeInteger(
  value: unknown,
  fieldName: string,
): number {
  const coerced = typeof value === "number" ? Math.trunc(value) : 0;
  if (coerced < 0) {
    throw new HookExecutionError(
      `createRecords ${fieldName} must be a non-negative number.`,
    );
  }
  return coerced;
}
