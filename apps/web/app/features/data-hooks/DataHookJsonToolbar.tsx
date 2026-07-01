import { useState } from "react";
import { Code2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Modal, Text, toast } from "@repo/ui";

import { useDataHooks } from "./data-hooks-context";

const textareaClassName =
  "border-input bg-background flex min-h-[240px] w-full rounded-md border px-3 py-2 font-mono text-xs";

const OMITTED_EXPORT_KEYS = new Set([
  "id",
  "tenantId",
  "createdAt",
  "updatedAt",
]);

function serializeDefinition(definition: unknown): string {
  const source = definition as Record<string, unknown>;
  const rest = Object.fromEntries(
    Object.entries(source).filter(([key]) => !OMITTED_EXPORT_KEYS.has(key)),
  );
  return JSON.stringify(rest, null, 2);
}

export function DataHookJsonToolbar() {
  const { t } = useTranslation("common");
  const { editor, canCreate } = useDataHooks();
  const [viewOpen, setViewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  const selected = editor.selectedDefinition;

  async function handleImport() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(importText);
    } catch {
      toast.error(t("dataHooks.json.invalid"));
      return;
    }
    setImporting(true);
    try {
      const result = await editor.importDefinition(parsed);
      if (typeof result === "string") {
        toast.error(result);
        return;
      }
      toast.success(t("dataHooks.json.imported"));
      setImportOpen(false);
      setImportText("");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!selected}
        onClick={() => setViewOpen(true)}
      >
        <Code2 aria-hidden className="mr-1 size-4" />
        {t("dataHooks.json.view")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canCreate}
        onClick={() => setImportOpen(true)}
      >
        <Upload aria-hidden className="mr-1 size-4" />
        {t("dataHooks.json.import")}
      </Button>

      <Modal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title={t("dataHooks.json.viewTitle")}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (selected) {
                  void navigator.clipboard?.writeText(
                    serializeDefinition(selected),
                  );
                  toast.success(t("dataHooks.json.copied"));
                }
              }}
            >
              {t("dataHooks.json.copy")}
            </Button>
            <Button type="button" onClick={() => setViewOpen(false)}>
              {t("dataHooks.cancel")}
            </Button>
          </div>
        }
      >
        <textarea
          className={textareaClassName}
          readOnly
          value={selected ? serializeDefinition(selected) : ""}
          spellCheck={false}
        />
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title={t("dataHooks.json.importTitle")}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportOpen(false)}
            >
              {t("dataHooks.cancel")}
            </Button>
            <Button
              type="button"
              loading={importing}
              disabled={!canCreate || importText.trim().length === 0}
              onClick={() => void handleImport()}
            >
              {t("dataHooks.json.import")}
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <Text className="text-muted-foreground text-xs">
            {t("dataHooks.json.importHint")}
          </Text>
          <textarea
            className={textareaClassName}
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            spellCheck={false}
          />
        </div>
      </Modal>
    </div>
  );
}
