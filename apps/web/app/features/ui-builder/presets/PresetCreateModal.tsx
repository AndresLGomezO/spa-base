import { useMemo, useState } from "react";
import type { CreateUiBuilderPresetInput } from "@repo/entities";
import type { DesignSurface } from "@repo/ui-builder-core";
import { Button, Input, Modal, Text } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { useTranslation } from "react-i18next";

import { usePresets } from "./presets-context";

const PRESET_KINDS = [
  "layout-document",
  "column",
  "grid-track",
  "component-row",
] as const;

const DESIGN_SURFACES: readonly DesignSurface[] = [
  "listItem",
  "tableColumnCell",
  "tableRowExpand",
  "mainPage",
  "recordDetail",
  "formCreate",
  "formEdit",
  "formPlain",
  "formWizardShell",
  "formWizardStep",
  "formModalFooter",
  "metricStrip",
  "metricRow",
  "metricWidget",
  "dashboardSection",
  "dashboardLayout",
  "sidebarLayout",
];

const EMPTY_TEMPLATE =
  '{\n  "root": {\n    "type": "root",\n    "id": "preset-root",\n    "columnCount": 1,\n    "columns": []\n  }\n}';

export function PresetCreateModal() {
  const { t } = useTranslation("common");
  const { editor, canCreate, createModalOpen, closeCreateModal } = usePresets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] =
    useState<CreateUiBuilderPresetInput["kind"]>("layout-document");
  const [designSurface, setDesignSurface] = useState<DesignSurface | "">(
    "listItem",
  );
  const [templateJson, setTemplateJson] = useState(EMPTY_TEMPLATE);
  const [error, setError] = useState<string | null>(null);

  const designSurfaces = useMemo(() => DESIGN_SURFACES, []);

  const handleClose = () => {
    setError(null);
    closeCreateModal();
  };

  const handleCreate = async () => {
    if (!canCreate || name.trim().length === 0) {
      return;
    }

    setError(null);
    const saveError = await editor.createPreset({
      name: name.trim(),
      description: description.trim() || undefined,
      kind,
      designSurface: designSurface || undefined,
      templateJson,
      fieldSlots: [],
    });

    if (saveError) {
      setError(saveError);
      return;
    }

    setName("");
    setDescription("");
    setKind("layout-document");
    setDesignSurface("listItem");
    setTemplateJson(EMPTY_TEMPLATE);
    closeCreateModal();
  };

  return (
    <Modal
      open={createModalOpen}
      onClose={handleClose}
      title={t("designLayout.presets.createTitle")}
      size="lg"
      scrollable
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t("designLayout.presets.cancel")}
          </Button>
          <Button
            type="button"
            loading={editor.isSaving}
            disabled={!canCreate || name.trim().length === 0}
            onClick={() => void handleCreate()}
          >
            {t("designLayout.presets.save")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("designLayout.presets.name")}</span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("designLayout.presets.descriptionField")}</span>
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("designLayout.presets.list.kindLabel")}</span>
          <Select
            value={kind}
            onChange={(event) =>
              setKind(event.target.value as CreateUiBuilderPresetInput["kind"])
            }
          >
            {PRESET_KINDS.map((entry) => (
              <option key={entry} value={entry}>
                {t(`designLayout.presets.kind.${entry}`)}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("designLayout.presets.list.surfaceLabel")}</span>
          <Select
            value={designSurface}
            onChange={(event) =>
              setDesignSurface(event.target.value as DesignSurface | "")
            }
          >
            <option value="">—</option>
            {designSurfaces.map((surface) => (
              <option key={surface} value={surface}>
                {surface}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("designLayout.presets.templateJson")}</span>
          <textarea
            className="border-input bg-background min-h-[200px] w-full rounded-md border px-3 py-2 font-mono text-sm"
            value={templateJson}
            onChange={(event) => setTemplateJson(event.target.value)}
            spellCheck={false}
          />
        </label>
        {error ? (
          <Text className="text-destructive text-sm">{error}</Text>
        ) : null}
      </div>
    </Modal>
  );
}
