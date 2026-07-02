import { useCallback, useMemo, useState } from "react";
import {
  createEntityRecordsExportEnvelope,
  type EntityRecordsExportEnvelope,
  type SerializableEntityDefinition,
} from "@repo/entities";
import { toast, Button } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { EntityName } from "../../../entities/entity-catalog";
import {
  fetchEntityRecordsJsonExport,
  submitEntityRecordsJsonImport,
  type ApiClientError,
} from "../../../lib/api-client";
import { queryClient } from "../../../query/query-client";
import { IndexEnvironmentBlockedNotice } from "../../index-provisioning/IndexEnvironmentBlockedNotice";
import { useTenantIndexReadiness } from "../../../hooks/useTenantIndexReadiness";
import { EntityRecordsJsonImportDialog } from "./EntityRecordsJsonImportDialog.js";
import { EntityRecordsJsonViewDialog } from "./EntityRecordsJsonViewDialog.js";
import type { EntityRecordsJsonLabels } from "./entity-records-json-labels.js";

interface EntityRecordsJsonToolbarProps {
  readonly entityName: EntityName;
  readonly definition: SerializableEntityDefinition;
  readonly exportEnvelope?: EntityRecordsExportEnvelope;
  readonly triggerSize?: "sm" | "md" | "lg";
  readonly onImportSuccess?: () => void;
}

function isApiClientError(error: unknown): error is ApiClientError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}

export function EntityRecordsJsonToolbar({
  entityName,
  definition,
  exportEnvelope,
  triggerSize = "sm",
  onImportSuccess,
}: EntityRecordsJsonToolbarProps) {
  const { t } = useTranslation("common");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fetchedExport, setFetchedExport] =
    useState<EntityRecordsExportEnvelope | null>(null);

  const labels = useMemo<EntityRecordsJsonLabels>(
    () => ({
      exportTrigger: t("entity.recordsJson.exportTrigger"),
      importTrigger: t("entity.recordsJson.importTrigger"),
      viewTitle: t("entity.recordsJson.viewTitle"),
      viewDescription: t("entity.recordsJson.viewDescription"),
      viewCopy: t("entity.recordsJson.viewCopy"),
      viewCopied: t("entity.recordsJson.viewCopied"),
      importTitle: t("entity.recordsJson.importTitle"),
      importDescription: t("entity.recordsJson.importDescription"),
      pasteLabel: t("entity.recordsJson.pasteLabel"),
      uploadLabel: t("entity.recordsJson.uploadLabel"),
      skeletonTitle: t("entity.recordsJson.skeletonTitle"),
      skeletonShow: t("entity.recordsJson.skeletonShow"),
      skeletonHide: t("entity.recordsJson.skeletonHide"),
      valid: t("entity.recordsJson.valid"),
      invalid: t("entity.recordsJson.invalid"),
      apply: t("entity.recordsJson.apply"),
      cancel: t("entity.recordsJson.cancel"),
      exportLoading: t("entity.recordsJson.exportLoading"),
      exportFailed: t("entity.recordsJson.exportFailed"),
      importFailed: t("entity.recordsJson.importFailed"),
    }),
    [t],
  );

  const resolvedExport = exportEnvelope ?? fetchedExport;
  const { isEnvironmentReady, buildingCollections } = useTenantIndexReadiness();
  const exportJsonText = useMemo(
    () =>
      resolvedExport
        ? JSON.stringify(resolvedExport, null, 2)
        : JSON.stringify(
            createEntityRecordsExportEnvelope(entityName, []),
            null,
            2,
          ),
    [entityName, resolvedExport],
  );

  const handleExportOpen = useCallback(async () => {
    if (exportEnvelope) {
      setExportOpen(true);
      return;
    }

    setExportOpen(true);
    setExportLoading(true);
    try {
      const envelope = await fetchEntityRecordsJsonExport(entityName);
      setFetchedExport(envelope);
    } catch {
      toast.error(labels.exportFailed);
      setExportOpen(false);
    } finally {
      setExportLoading(false);
    }
  }, [entityName, exportEnvelope, labels.exportFailed]);

  const handleImport = useCallback(
    async (body: unknown) => {
      setImporting(true);
      try {
        const result = await submitEntityRecordsJsonImport(entityName, body);
        toast.success(
          t("entity.recordsJson.importSuccessSummary", {
            created: result.created,
            updated: result.updated,
          }),
        );
        await queryClient.invalidateQueries({
          queryKey: ["entity", entityName],
        });
        onImportSuccess?.();
      } catch (error) {
        if (isApiClientError(error)) {
          toast.error(error.message || labels.importFailed);
        } else {
          toast.error(labels.importFailed);
        }
        throw error;
      } finally {
        setImporting(false);
      }
    },
    [entityName, labels.importFailed, onImportSuccess, t],
  );

  return (
    <div className="flex flex-col gap-2">
      {!isEnvironmentReady ? (
        <IndexEnvironmentBlockedNotice
          feature="import"
          buildingCollections={buildingCollections}
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size={triggerSize}
          loading={exportLoading}
          onClick={() => void handleExportOpen()}
        >
          {labels.exportTrigger}
        </Button>
        <EntityRecordsJsonViewDialog
          jsonText={exportJsonText}
          labels={labels}
          loading={exportLoading}
          open={exportOpen}
          onOpenChange={setExportOpen}
          showTrigger={false}
        />
        <EntityRecordsJsonImportDialog
          definition={definition}
          labels={labels}
          triggerSize={triggerSize}
          applying={importing}
          importDisabled={!isEnvironmentReady}
          onApply={handleImport}
        />
      </div>
    </div>
  );
}
