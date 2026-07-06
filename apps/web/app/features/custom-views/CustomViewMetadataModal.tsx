import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, FieldLabel, Input, Modal, Select, toast } from "@repo/ui";
import { useQuery } from "@tanstack/react-query";

import { listEntityQueryDefinitions } from "../../lib/api-client";
import { useCustomViews } from "./custom-views-context";

const selectClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";

interface CustomViewMetadataModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function CustomViewMetadataModal({
  open,
  onClose,
}: CustomViewMetadataModalProps) {
  const { t } = useTranslation("common");
  const { editor, canCreate } = useCustomViews();

  const queriesQuery = useQuery({
    queryKey: ["entity-query-definitions", "custom-views-create"],
    queryFn: async () => {
      const result = await listEntityQueryDefinitions();
      return result.items.filter((item) => item.status === "ACTIVE");
    },
    enabled: open,
  });

  const [name, setName] = useState("");
  const [entityQueryDefinitionId, setEntityQueryDefinitionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName("");
    setEntityQueryDefinitionId("");
  }, [open]);

  const queryOptions = useMemo(
    () =>
      (queriesQuery.data ?? []).map((query) => ({
        value: query.id,
        label: `${query.name} (${query.sourceEntity})`,
      })),
    [queriesQuery.data],
  );

  const canSubmit =
    canCreate &&
    name.trim().length > 0 &&
    entityQueryDefinitionId.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await editor.createView({
        name: name.trim(),
        entityQueryDefinitionId,
      });
      if (typeof result === "string") {
        toast.error(result);
        return;
      }
      toast.success(t("customViews.createSuccess"));
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("customViews.createModal.title")}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("customViews.cancel")}
          </Button>
          <Button
            type="button"
            loading={isSubmitting}
            disabled={!canSubmit || isSubmitting}
            onClick={() => void handleSubmit()}
          >
            {t("customViews.createModal.submit")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <FieldLabel htmlFor="custom-view-create-name">
            {t("customViews.fields.name")}
          </FieldLabel>
          <Input
            id="custom-view-create-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel htmlFor="custom-view-create-query">
            {t("customViews.fields.query")}
          </FieldLabel>
          <Select
            id="custom-view-create-query"
            className={selectClassName}
            value={entityQueryDefinitionId}
            onChange={(event) => setEntityQueryDefinitionId(event.target.value)}
          >
            <option value="">{t("customViews.fields.selectQuery")}</option>
            {queryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </Modal>
  );
}
