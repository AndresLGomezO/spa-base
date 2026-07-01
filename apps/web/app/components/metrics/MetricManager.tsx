import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "@repo/ui";

import {
  listMetricDefinitions,
  type MetricDefinitionRecord,
} from "../../lib/api-client";
import { FormModal } from "../forms/FormModal";
import { MetricDefinitionEditor } from "./MetricDefinitionEditor";
import { MetricDefinitionList } from "./MetricDefinitionList";

interface MetricManagerProps {
  readonly tenantId: string;
  readonly canCreate?: boolean;
  readonly canUpdate?: boolean;
  readonly canBackfill?: boolean;
}

export function MetricManager({
  tenantId,
  canCreate = true,
  canUpdate = true,
  canBackfill = false,
}: MetricManagerProps) {
  const { t } = useTranslation("common");
  const [items, setItems] = useState<readonly MetricDefinitionRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const editingMetric =
    editingId === null
      ? null
      : (items.find((item) => item.id === editingId) ?? null);

  const loadMetrics = useCallback(async () => {
    if (!tenantId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await listMetricDefinitions();
      setItems(result.items);
    } catch (loadError) {
      toast.error(
        loadError instanceof Error
          ? loadError.message
          : t("metrics.loadFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t, tenantId]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  function closeModal() {
    setIsCreating(false);
    setEditingId(null);
  }

  function handleSaved(metric: MetricDefinitionRecord) {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === metric.id);
      if (index === -1) {
        return [...current, metric].sort((left, right) =>
          left.name.localeCompare(right.name),
        );
      }
      return current.map((item) => (item.id === metric.id ? metric : item));
    });
    closeModal();
  }

  const modalOpen = isCreating || editingId !== null;
  const modalTitle = useMemo(() => {
    if (isCreating) {
      return t("metrics.createTitle");
    }
    return editingMetric?.name ?? t("metrics.editTitle");
  }, [editingMetric?.name, isCreating, t]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MetricDefinitionList
        items={items}
        isLoading={isLoading}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canBackfill={canBackfill}
        onCreate={() => setIsCreating(true)}
        onEdit={setEditingId}
        onCatalogReplaced={() => {
          void loadMetrics();
        }}
      />
      <FormModal
        open={modalOpen}
        onClose={closeModal}
        title={modalTitle}
        size="lg"
      >
        <MetricDefinitionEditor
          metric={isCreating ? null : editingMetric}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canBackfill={canBackfill}
          onSaved={handleSaved}
          onCancel={closeModal}
        />
      </FormModal>
    </div>
  );
}
