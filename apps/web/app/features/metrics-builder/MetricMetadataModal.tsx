import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, FieldLabel, Input, Modal, Text, toast } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import type { MetricComputationMode } from "@repo/metrics-engine/browser";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { getEntityLabel } from "../../entities/entity-catalog";
import { useMetrics } from "./metrics-context";

interface MetricMetadataModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

const controlClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";
const textareaClassName =
  "border-input bg-background flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm";

export function MetricMetadataModal({
  open,
  onClose,
}: MetricMetadataModalProps) {
  const { t } = useTranslation("common");
  const { editor, canCreate } = useMetrics();
  const { items: entities } = useEntityCatalog();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [computationMode, setComputationMode] =
    useState<MetricComputationMode>("aggregated");
  const [sourceModel, setSourceModel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const entityOptions = useMemo(
    () =>
      entities.map((entity) => ({
        name: entity.name,
        label: getEntityLabel(entity),
      })),
    [entities],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setName("");
    setDescription("");
    setComputationMode("aggregated");
    setSourceModel(entities[0]?.name ?? "");
  }, [entities, open]);

  const canSubmit =
    canCreate && name.trim().length > 0 && sourceModel.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await editor.createMetric({
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        computationMode,
        sourceModel,
      });
      if (typeof result === "string") {
        toast.error(result);
        return;
      }
      toast.success(t("metrics.workbench.metadata.created"));
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("metrics.workbench.metadata.createTitle")}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("metrics.cancel")}
          </Button>
          <Button
            type="button"
            loading={isSubmitting}
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {t("metrics.workbench.metadata.createAction")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <FieldLabel htmlFor="metric-metadata-name">
            {t("metrics.name")}
          </FieldLabel>
          <Input
            id="metric-metadata-name"
            className={controlClassName}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="space-y-1">
          <FieldLabel htmlFor="metric-metadata-description">
            {t("metrics.descriptionLabel")}
          </FieldLabel>
          <textarea
            id="metric-metadata-description"
            className={textareaClassName}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("metrics.descriptionPlaceholder")}
          />
        </div>

        <div className="space-y-1">
          <FieldLabel htmlFor="metric-metadata-mode">
            {t("metrics.workbench.metadata.computationMode")}
          </FieldLabel>
          <Select
            id="metric-metadata-mode"
            className={controlClassName}
            value={computationMode}
            onChange={(event) =>
              setComputationMode(event.target.value as MetricComputationMode)
            }
          >
            <option value="aggregated">
              {t("metrics.workbench.list.modeAggregated")}
            </option>
            <option value="computed">
              {t("metrics.workbench.list.modeComputed")}
            </option>
          </Select>
        </div>

        <div className="space-y-1">
          <FieldLabel htmlFor="metric-metadata-source-model">
            {t("metrics.sourceModel")}
          </FieldLabel>
          <Select
            id="metric-metadata-source-model"
            className={controlClassName}
            value={sourceModel}
            onChange={(event) => setSourceModel(event.target.value)}
          >
            <option value="">{t("metrics.selectModel")}</option>
            {entityOptions.map((option) => (
              <option key={option.name} value={option.name}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {computationMode === "computed" ? (
          <Text className="text-muted-foreground text-sm">
            {t("metrics.workbench.metadata.computedHint")}
          </Text>
        ) : null}
      </div>
    </Modal>
  );
}
