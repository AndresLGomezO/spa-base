import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Heading, Input, PageLoader, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import {
  getPreviewTransactions,
  readPreviewNumber,
  readPreviewString,
  type StatementExtractionDlpFinding,
  type StatementExtractionPreviewTransaction,
  type StatementExtractionRecord,
} from "./api";
import {
  useStatementExtraction,
  useStatementExtractionActions,
} from "./useStatementExtraction";

type EditableTransaction = {
  date: string;
  amount: string;
  description: string;
};

function toEditableTransactions(
  transactions: readonly StatementExtractionPreviewTransaction[],
): EditableTransaction[] {
  return transactions.map((txn) => ({
    date: typeof txn.date === "string" ? txn.date : "",
    amount:
      typeof txn.amount === "number"
        ? String(txn.amount)
        : typeof txn.amount === "string"
          ? txn.amount
          : "",
    description: typeof txn.description === "string" ? txn.description : "",
  }));
}

function formatBalance(value: number | undefined, currency?: string): string {
  if (value === undefined) {
    return "—";
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: currency ? "currency" : "decimal",
      currency: currency || undefined,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return String(value);
  }
}

function StatusBadge({ status }: { readonly status: string }) {
  const { t } = useTranslation("common");
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
        status === "awaitingReview" &&
          "bg-amber-500/15 text-amber-700 dark:text-amber-300",
        status === "applied" &&
          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        status === "rejected" &&
          "bg-rose-500/15 text-rose-700 dark:text-rose-300",
        status === "failed" &&
          "bg-rose-500/15 text-rose-700 dark:text-rose-300",
        status === "processing" &&
          "bg-sky-500/15 text-sky-700 dark:text-sky-300",
      )}
    >
      {t(`statementExtractions.status.${status}`, { defaultValue: status })}
    </span>
  );
}

function PreviewSummary({
  record,
}: {
  readonly record: StatementExtractionRecord;
}) {
  const { t } = useTranslation("common");
  const { preview } = record;
  const currency = readPreviewString(preview, "currency");
  const statementDate = readPreviewString(
    preview,
    "statementDate",
    "closingDate",
    "openingDate",
  );
  const openingBalance = readPreviewNumber(preview, "openingBalance");
  const closingBalance = readPreviewNumber(
    preview,
    "closingBalance",
    "balance",
  );
  const txnCount = getPreviewTransactions(preview).length;

  const fields = [
    {
      label: t("statementExtractions.fields.statementDate"),
      value: statementDate ?? "—",
    },
    {
      label: t("statementExtractions.fields.openingBalance"),
      value: formatBalance(openingBalance, currency),
    },
    {
      label: t("statementExtractions.fields.closingBalance"),
      value: formatBalance(closingBalance, currency),
    },
    {
      label: t("statementExtractions.fields.transactionCount"),
      value: String(txnCount),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {fields.map((field) => (
        <div
          key={field.label}
          className="border-border bg-muted/30 rounded-md border px-3 py-2"
        >
          <Text className="text-muted-foreground text-xs">{field.label}</Text>
          <Text className="mt-0.5 text-sm font-medium">{field.value}</Text>
        </div>
      ))}
    </div>
  );
}

function DlpFindingsSidebar({
  findings,
}: {
  readonly findings: readonly StatementExtractionDlpFinding[];
}) {
  const { t } = useTranslation("common");

  return (
    <aside className="border-border bg-muted/20 flex w-full flex-col gap-3 rounded-md border p-3 lg:w-64 lg:shrink-0">
      <Heading level={3} className="text-sm">
        {t("statementExtractions.dlpFindings")}
      </Heading>
      {findings.length === 0 ? (
        <Text className="text-muted-foreground text-sm">
          {t("statementExtractions.dlpFindingsEmpty")}
        </Text>
      ) : (
        <ul className="flex flex-col gap-2">
          {findings.map((finding, index) => (
            <li
              key={`${finding.infoType}-${index}`}
              className="border-border bg-background rounded-md border px-2.5 py-2"
            >
              <Text className="text-sm font-medium">{finding.infoType}</Text>
              <Text className="text-muted-foreground mt-0.5 text-xs">
                {t(`statementExtractions.dlpAction.${finding.action}`, {
                  defaultValue: finding.action,
                })}{" "}
                · {finding.likelihood}
              </Text>
              {finding.quote ? (
                <Text className="text-muted-foreground mt-1 truncate text-xs">
                  {finding.quote}
                </Text>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function TransactionsEditor({
  transactions,
  disabled,
  onChange,
}: {
  readonly transactions: readonly EditableTransaction[];
  readonly disabled: boolean;
  readonly onChange: (next: EditableTransaction[]) => void;
}) {
  const { t } = useTranslation("common");

  if (transactions.length === 0) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("statementExtractions.transactionsEmpty")}
      </Text>
    );
  }

  return (
    <div className="border-border overflow-hidden rounded-md border">
      <div className="bg-muted/40 text-muted-foreground grid grid-cols-[7rem_7rem_1fr] gap-2 border-b px-3 py-2 text-xs font-medium">
        <span>{t("statementExtractions.fields.date")}</span>
        <span>{t("statementExtractions.fields.amount")}</span>
        <span>{t("statementExtractions.fields.description")}</span>
      </div>
      <ul className="divide-border divide-y">
        {transactions.map((txn, index) => (
          <li
            key={`txn-${index}`}
            className="grid grid-cols-[7rem_7rem_1fr] gap-2 px-3 py-2"
          >
            <Input
              value={txn.date}
              disabled={disabled}
              aria-label={t("statementExtractions.fields.date")}
              onChange={(event) => {
                const next = [...transactions];
                next[index] = { ...txn, date: event.target.value };
                onChange(next);
              }}
            />
            <Input
              value={txn.amount}
              disabled={disabled}
              inputMode="decimal"
              aria-label={t("statementExtractions.fields.amount")}
              onChange={(event) => {
                const next = [...transactions];
                next[index] = { ...txn, amount: event.target.value };
                onChange(next);
              }}
            />
            <Input
              value={txn.description}
              disabled={disabled}
              aria-label={t("statementExtractions.fields.description")}
              onChange={(event) => {
                const next = [...transactions];
                next[index] = { ...txn, description: event.target.value };
                onChange(next);
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function buildTransactionEdits(
  original: readonly StatementExtractionPreviewTransaction[],
  edited: readonly EditableTransaction[],
): Record<string, unknown> | undefined {
  const nextTransactions = edited.map((txn, index) => {
    const base =
      original[index] && typeof original[index] === "object"
        ? { ...original[index] }
        : {};
    const amountRaw = txn.amount.trim();
    const amountNumber = amountRaw === "" ? undefined : Number(amountRaw);
    return {
      ...base,
      date: txn.date,
      description: txn.description,
      amount:
        amountNumber !== undefined && Number.isFinite(amountNumber)
          ? amountNumber
          : amountRaw,
    };
  });

  const unchanged =
    original.length === nextTransactions.length &&
    original.every((txn, index) => {
      const next = nextTransactions[index];
      return (
        String(txn.date ?? "") === String(next.date ?? "") &&
        String(txn.description ?? "") === String(next.description ?? "") &&
        String(txn.amount ?? "") === String(next.amount ?? "")
      );
    });

  if (unchanged) {
    return undefined;
  }
  return { transactions: nextTransactions };
}

export function StatementExtractionDetail({
  extractionId,
  canRun,
  onActionComplete,
}: {
  readonly extractionId: string;
  readonly canRun: boolean;
  readonly onActionComplete?: () => void;
}) {
  const { t } = useTranslation("common");
  const detailQuery = useStatementExtraction({ id: extractionId });
  const actions = useStatementExtractionActions({
    id: extractionId,
    onSettledSuccess: onActionComplete,
  });

  const record = detailQuery.data;
  const originalTransactions = useMemo(
    () => (record ? getPreviewTransactions(record.preview) : []),
    [record],
  );
  const [transactions, setTransactions] = useState<EditableTransaction[]>([]);

  useEffect(() => {
    setTransactions(toEditableTransactions(originalTransactions));
  }, [originalTransactions]);

  if (detailQuery.isLoading) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (detailQuery.isError || !record) {
    return <Alert>{t("statementExtractions.loadFailed")}</Alert>;
  }

  const isAwaitingReview = record.status === "awaitingReview";
  const canReject =
    record.status === "awaitingReview" || record.status === "processing";
  const applyDisabled = !canRun || !isAwaitingReview || actions.isMutating;
  const rejectDisabled = !canRun || !canReject || actions.isMutating;
  const rerunDisabled = !canRun || actions.isMutating;
  const applyTitle = !canRun
    ? t("statementExtractions.runForbidden")
    : !isAwaitingReview
      ? t("statementExtractions.notAwaitingReview")
      : undefined;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4"
      data-testid="statement-extraction-detail"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Heading level={2} className="text-base">
              {record.documentType ??
                t("statementExtractions.untitledExtraction")}
            </Heading>
            <StatusBadge status={record.status} />
          </div>
          <Text className="text-muted-foreground text-xs">
            {t("statementExtractions.attachmentId")}: {record.attachmentId}
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={rerunDisabled}
            title={!canRun ? t("statementExtractions.runForbidden") : undefined}
            loading={actions.rerunning}
            onClick={() => actions.rerun(record.templateId)}
            data-testid="statement-extraction-rerun"
          >
            {t("statementExtractions.rerun")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={rejectDisabled}
            title={
              !canRun
                ? t("statementExtractions.runForbidden")
                : !canReject
                  ? t("statementExtractions.notAwaitingReview")
                  : undefined
            }
            loading={actions.rejecting}
            onClick={() => actions.reject()}
            data-testid="statement-extraction-reject"
          >
            {t("statementExtractions.reject")}
          </Button>
          <Button
            size="sm"
            disabled={applyDisabled}
            title={applyTitle}
            loading={actions.applying}
            onClick={() => {
              const edits = buildTransactionEdits(
                originalTransactions,
                transactions,
              );
              actions.apply(edits);
            }}
            data-testid="statement-extraction-apply"
          >
            {t("statementExtractions.apply")}
          </Button>
        </div>
      </div>

      {!canRun ? <Alert>{t("statementExtractions.runForbidden")}</Alert> : null}

      {record.error ? <Alert>{record.error}</Alert> : null}

      <PreviewSummary record={record} />

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Heading level={3} className="text-sm">
            {t("statementExtractions.transactions")}
          </Heading>
          <TransactionsEditor
            transactions={transactions}
            disabled={!canRun || !isAwaitingReview || actions.isMutating}
            onChange={setTransactions}
          />
        </div>
        <DlpFindingsSidebar findings={record.dlpFindings ?? []} />
      </div>

      {record.confidence !== undefined ? (
        <Text className="text-muted-foreground text-xs">
          {t("statementExtractions.confidence", {
            value: Math.round(record.confidence * 100),
          })}
        </Text>
      ) : null}
    </div>
  );
}
