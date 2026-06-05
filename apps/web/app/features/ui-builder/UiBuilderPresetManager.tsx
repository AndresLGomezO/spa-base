import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Alert, Button, Heading, Input, Text, toast } from "@repo/ui";
import type { UiBuilderPresetRecord } from "@repo/entities";
import { useTranslation } from "react-i18next";

import {
  deleteUiBuilderPreset,
  listUiBuilderPresets,
  updateUiBuilderPreset,
} from "../../lib/api-client.js";

interface UiBuilderPresetManagerProps {
  readonly canUpdate: boolean;
}

export function UiBuilderPresetManager({
  canUpdate,
}: UiBuilderPresetManagerProps) {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateJson, setTemplateJson] = useState("");

  const presetsQuery = useQuery({
    queryKey: ["ui-builder-presets"],
    queryFn: async () => {
      const result = await listUiBuilderPresets();
      return result.items;
    },
  });

  const selectedPreset = useMemo(
    () => presetsQuery.data?.find((preset) => preset.id === selectedId) ?? null,
    [presetsQuery.data, selectedId],
  );

  const selectPreset = (preset: UiBuilderPresetRecord) => {
    setSelectedId(preset.id);
    setName(preset.name);
    setDescription(preset.description ?? "");
    setTemplateJson(preset.templateJson);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPreset) {
        return;
      }
      await updateUiBuilderPreset(selectedPreset.id, {
        name,
        description: description.trim().length > 0 ? description : undefined,
        templateJson,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ui-builder-presets"] });
      toast.success(t("designLayout.presets.saved"));
    },
    onError: () => {
      toast.error(t("designLayout.presets.saveFailed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (presetId: string) => {
      await deleteUiBuilderPreset(presetId);
    },
    onSuccess: async () => {
      setSelectedId(null);
      await queryClient.invalidateQueries({ queryKey: ["ui-builder-presets"] });
      toast.success(t("designLayout.presets.deleted"));
    },
    onError: () => {
      toast.error(t("designLayout.presets.deleteFailed"));
    },
  });

  if (presetsQuery.isLoading) {
    return <Text>{t("loading")}</Text>;
  }

  if (presetsQuery.isError) {
    return <Alert>{t("designLayout.presets.loadFailed")}</Alert>;
  }

  const presets = presetsQuery.data ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Heading level={2}>{t("designLayout.presets.listTitle")}</Heading>
        {presets.length === 0 ? (
          <Text className="text-muted-foreground text-sm">
            {t("designLayout.presets.empty")}
          </Text>
        ) : (
          <div className="flex flex-col gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`border-border rounded-md border p-3 text-left ${
                  selectedId === preset.id ? "bg-muted" : ""
                }`}
                onClick={() => selectPreset(preset)}
              >
                <div className="font-medium">{preset.name}</div>
                <div className="text-muted-foreground text-sm">
                  {t(`designLayout.presets.kind.${preset.kind}`)} ·{" "}
                  {preset.fieldSlots.length}{" "}
                  {t(
                    preset.fieldSlots.length === 1
                      ? "designLayout.presets.slot"
                      : "designLayout.presets.slots",
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Heading level={2}>{t("designLayout.presets.detailTitle")}</Heading>
        {!selectedPreset ? (
          <Text className="text-muted-foreground text-sm">
            {t("designLayout.presets.selectHint")}
          </Text>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span>{t("designLayout.presets.name")}</span>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={!canUpdate}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>{t("designLayout.presets.descriptionField")}</span>
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={!canUpdate}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>{t("designLayout.presets.templateJson")}</span>
              <textarea
                className="border-input bg-background min-h-[240px] w-full rounded-md border px-3 py-2 font-mono text-sm"
                value={templateJson}
                onChange={(event) => setTemplateJson(event.target.value)}
                disabled={!canUpdate}
                spellCheck={false}
              />
            </label>
            <div className="flex flex-col gap-2">
              <Text className="text-sm font-medium">
                {t("designLayout.presets.fieldSlotsTitle")}
              </Text>
              {selectedPreset.fieldSlots.length === 0 ? (
                <Text className="text-muted-foreground text-sm">
                  {t("designLayout.presets.noFieldSlots")}
                </Text>
              ) : (
                <ul className="text-sm">
                  {selectedPreset.fieldSlots.map((slot) => (
                    <li key={slot.id}>
                      {slot.label ?? slot.id}: {slot.sourceHint ?? slot.kind}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {canUpdate ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  loading={saveMutation.isPending}
                  onClick={() => void saveMutation.mutate()}
                >
                  {t("designLayout.presets.save")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  loading={deleteMutation.isPending}
                  onClick={() => void deleteMutation.mutate(selectedPreset.id)}
                >
                  {t("designLayout.presets.delete")}
                </Button>
              </div>
            ) : (
              <Text className="text-muted-foreground text-sm">
                {t("designLayout.readOnly")}
              </Text>
            )}
          </>
        )}
      </div>
    </div>
  );
}
