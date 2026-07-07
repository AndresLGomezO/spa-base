import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, FieldLabel, Input, Modal, Text, toast } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import type { ChartType } from "@repo/ui-builder-core";

import { useCharts } from "./charts-context.js";

interface ChartMetadataModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

const controlClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";

export function ChartMetadataModal({ open, onClose }: ChartMetadataModalProps) {
  const { t } = useTranslation("common");
  const { editor, canCreate } = useCharts();
  const [name, setName] = useState("");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName("");
    setChartType("line");
  }, [open]);

  const canSubmit = canCreate && name.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await editor.createChart({
        name: name.trim(),
        chartType,
      });
      if (typeof result === "string") {
        toast.error(result);
        return;
      }
      toast.success(t("charts.workbench.createSuccess"));
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("charts.workbench.createTitle")}
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <FieldLabel>{t("charts.workbench.fields.name")}</FieldLabel>
          <Input
            className={controlClassName}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <FieldLabel>{t("chartComponent.chartType")}</FieldLabel>
          <Select
            className={controlClassName}
            value={chartType}
            onChange={(event) => setChartType(event.target.value as ChartType)}
          >
            <option value="line">{t("chartComponent.types.line")}</option>
            <option value="area">{t("chartComponent.types.area")}</option>
          </Select>
        </label>
        {!canCreate ? (
          <Text className="text-muted-foreground text-sm">
            {t("charts.workbench.createForbidden")}
          </Text>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("entity.cancel")}
          </Button>
          <Button
            disabled={!canSubmit || isSubmitting}
            onClick={() => void handleSubmit()}
          >
            {t("charts.workbench.createAction")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
