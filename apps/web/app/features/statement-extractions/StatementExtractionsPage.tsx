import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Alert, BuilderPageShell, Heading, PageLoader, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import {
  getPreviewTransactions,
  readPreviewString,
  type StatementExtractionRecord,
} from "./api";
import { StatementExtractionDetail } from "./StatementExtractionDetail";
import { useStatementExtractions } from "./useStatementExtractions";

function ExtractionListItem({
  item,
  selected,
  onSelect,
}: {
  readonly item: StatementExtractionRecord;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const { t } = useTranslation("common");
  const title =
    item.documentType ??
    readPreviewString(item.preview, "statementDate") ??
    t("statementExtractions.untitledExtraction");
  const txnCount = getPreviewTransactions(item.preview).length;
  const created = new Date(item.createdAt);
  const createdLabel = Number.isNaN(created.getTime())
    ? item.createdAt
    : created.toLocaleString();

  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`statement-extraction-list-item-${item.id}`}
      className={cn(
        "border-border hover:bg-muted/50 w-full rounded-md border px-3 py-2.5 text-left transition-colors",
        selected && "border-primary bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Text className="text-sm font-medium">{title}</Text>
        <Text className="text-muted-foreground shrink-0 text-xs">
          {t("statementExtractions.txnCountShort", { count: txnCount })}
        </Text>
      </div>
      <Text className="text-muted-foreground mt-1 text-xs">{createdLabel}</Text>
    </button>
  );
}

export function StatementExtractionsPage() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();
  const canRead = usePermission("ai.documentExtract.read");
  const canRun = usePermission("ai.documentExtract.run");
  const [searchParams, setSearchParams] = useSearchParams();

  const enabled = isReady && Boolean(tenantId) && canRead;
  const listQuery = useStatementExtractions({
    status: "awaitingReview",
    enabled,
  });

  const items = useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data?.items],
  );
  const selectedIdFromUrl = searchParams.get("id")?.trim() || null;

  const selectedId = useMemo(() => {
    if (
      selectedIdFromUrl &&
      items.some((item) => item.id === selectedIdFromUrl)
    ) {
      return selectedIdFromUrl;
    }
    return items[0]?.id ?? null;
  }, [items, selectedIdFromUrl]);

  const [clearedSelection, setClearedSelection] = useState(false);

  useEffect(() => {
    if (!selectedIdFromUrl && selectedId && !clearedSelection) {
      const params = new URLSearchParams(searchParams);
      params.set("id", selectedId);
      setSearchParams(params, { replace: true });
    }
  }, [
    clearedSelection,
    searchParams,
    selectedId,
    selectedIdFromUrl,
    setSearchParams,
  ]);

  function selectExtraction(id: string) {
    setClearedSelection(false);
    const params = new URLSearchParams(searchParams);
    params.set("id", id);
    setSearchParams(params, { replace: true });
  }

  function handleActionComplete() {
    setClearedSelection(true);
    const params = new URLSearchParams(searchParams);
    params.delete("id");
    setSearchParams(params, { replace: true });
  }

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canRead) {
    return (
      <div className="space-y-3 p-4">
        <Heading level={1}>{t("statementExtractions.title")}</Heading>
        <Alert>{t("statementExtractions.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3 p-4">
        <Heading level={1}>{t("statementExtractions.title")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  if (listQuery.isLoading) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (listQuery.isError) {
    return (
      <div className="space-y-3 p-4">
        <Heading level={1}>{t("statementExtractions.title")}</Heading>
        <Alert>{t("statementExtractions.loadFailed")}</Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-[var(--app-shell-footer-offset,0px)]">
      <BuilderPageShell
        title={t("statementExtractions.title")}
        subtitle={t("statementExtractions.description")}
      >
        {items.length === 0 ? (
          <Text
            className="text-muted-foreground text-sm"
            data-testid="statement-extractions-empty"
          >
            {t("statementExtractions.empty")}
          </Text>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
            <div className="flex w-full shrink-0 flex-col gap-2 lg:w-72">
              <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {t("statementExtractions.awaitingReviewList", {
                  count: items.length,
                })}
              </Text>
              <div className="flex flex-col gap-2 overflow-y-auto">
                {items.map((item) => (
                  <ExtractionListItem
                    key={item.id}
                    item={item}
                    selected={item.id === selectedId}
                    onSelect={() => selectExtraction(item.id)}
                  />
                ))}
              </div>
            </div>
            <div className="border-border min-h-0 min-w-0 flex-1 rounded-md border p-4">
              {selectedId ? (
                <StatementExtractionDetail
                  extractionId={selectedId}
                  canRun={canRun}
                  onActionComplete={handleActionComplete}
                />
              ) : (
                <Text className="text-muted-foreground text-sm">
                  {t("statementExtractions.selectPrompt")}
                </Text>
              )}
            </div>
          </div>
        )}
      </BuilderPageShell>
    </div>
  );
}
