import { apiRequest } from "../../lib/api-client";

export type StatementExtractionStatus =
  | "awaitingReview"
  | "applied"
  | "rejected"
  | "failed"
  | "processing";

export type StatementExtractionDlpFinding = {
  readonly infoType: string;
  readonly quote?: string;
  readonly likelihood: string;
  readonly action: "redacted" | "masked" | "kept";
};

export type StatementExtractionPreviewTransaction = {
  readonly date?: string;
  readonly amount?: number | string;
  readonly description?: string;
  readonly [key: string]: unknown;
};

export type StatementExtractionRecord = {
  readonly id: string;
  readonly tenantId: string;
  readonly attachmentId: string;
  readonly templateId?: string;
  readonly documentType?: string;
  readonly financialItemId?: string;
  readonly accountId?: string;
  readonly status: StatementExtractionStatus;
  readonly preview: Record<string, unknown>;
  readonly dlpFindings: readonly StatementExtractionDlpFinding[];
  readonly confidence?: number;
  readonly error?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly appliedAt?: string;
  readonly rejectedAt?: string;
  readonly requestedBy?: string;
};

type StatementExtractionListResponse = {
  readonly items: readonly StatementExtractionRecord[];
};

type StatementExtractionRerunResponse = {
  readonly enqueued: boolean;
  readonly taskName?: string;
  readonly attachmentId: string;
};

export function listStatementExtractions(options?: {
  readonly status?: StatementExtractionStatus | string;
  readonly limit?: number;
}): Promise<StatementExtractionListResponse> {
  return apiRequest<StatementExtractionListResponse>(
    "/api/statement-extractions",
    {
      query: {
        status: options?.status,
        limit: options?.limit,
      },
    },
  );
}

export function getStatementExtraction(
  id: string,
): Promise<StatementExtractionRecord> {
  return apiRequest<StatementExtractionRecord>(
    `/api/statement-extractions/${encodeURIComponent(id)}`,
  );
}

export function applyStatementExtraction(
  id: string,
  body?: { readonly edits?: Record<string, unknown> },
): Promise<StatementExtractionRecord> {
  return apiRequest<StatementExtractionRecord>(
    `/api/statement-extractions/${encodeURIComponent(id)}/apply`,
    {
      method: "POST",
      body: body ?? {},
    },
  );
}

export function rejectStatementExtraction(
  id: string,
): Promise<StatementExtractionRecord> {
  return apiRequest<StatementExtractionRecord>(
    `/api/statement-extractions/${encodeURIComponent(id)}/reject`,
    {
      method: "POST",
      body: {},
    },
  );
}

export function rerunStatementExtraction(
  id: string,
  body?: { readonly templateId?: string },
): Promise<StatementExtractionRerunResponse> {
  return apiRequest<StatementExtractionRerunResponse>(
    `/api/statement-extractions/${encodeURIComponent(id)}/rerun`,
    {
      method: "POST",
      body: body ?? {},
    },
  );
}

export function getPreviewTransactions(
  preview: Record<string, unknown>,
): StatementExtractionPreviewTransaction[] {
  const raw = preview.transactions;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (item): item is StatementExtractionPreviewTransaction =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

export function readPreviewString(
  preview: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = preview[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
}

export function readPreviewNumber(
  preview: Record<string, unknown>,
  ...keys: string[]
): number | undefined {
  for (const key of keys) {
    const value = preview[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}
