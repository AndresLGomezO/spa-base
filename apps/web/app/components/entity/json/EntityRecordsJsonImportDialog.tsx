import { useEffect, useMemo, useRef, useState } from "react";
import {
  parseEntityRecordsImportText,
  validateEntityRecordsImport,
  type SerializableEntityDefinition,
} from "@repo/entities";
import { Button, Modal, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { JsonImportErrors } from "../../data-models/json/JsonImportErrors.js";
import {
  buildEntityRecordsImportExample,
  formatEntityRecordsImportExampleJson,
} from "./build-entity-records-import-example.js";
import { defineEntityFromCatalogDefinition } from "./define-entity-from-catalog.js";
import { formatEntityRecordFieldSchemaNote } from "./format-entity-record-schema-notes.js";
import type { EntityRecordsJsonLabels } from "./entity-records-json-labels.js";

interface EntityRecordsJsonImportDialogProps {
  readonly definition: SerializableEntityDefinition;
  readonly labels: EntityRecordsJsonLabels;
  readonly onApply: (body: unknown) => Promise<void>;
  readonly triggerSize?: "sm" | "md" | "lg";
  readonly applying?: boolean;
}

export function EntityRecordsJsonImportDialog({
  definition,
  labels,
  onApply,
  triggerSize = "sm",
  applying = false,
}: EntityRecordsJsonImportDialogProps) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [showSkeleton, setShowSkeleton] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const entity = useMemo(
    () => defineEntityFromCatalogDefinition(definition),
    [definition],
  );

  const importExample = useMemo(
    () => buildEntityRecordsImportExample(definition),
    [definition],
  );

  const skeleton = useMemo(
    () => formatEntityRecordsImportExampleJson(importExample),
    [importExample],
  );

  const schemaNotesText = useMemo(
    () =>
      importExample.fieldNotes
        .map((note) => formatEntityRecordFieldSchemaNote(note, t))
        .join("\n\n"),
    [importExample.fieldNotes, t],
  );

  const validation = useMemo(() => {
    if (jsonText.trim().length === 0) {
      return { ok: false as const, errors: [] as const };
    }

    const parsed = parseEntityRecordsImportText(jsonText);
    if (!parsed.ok) {
      return parsed;
    }

    return validateEntityRecordsImport(entity, parsed.data);
  }, [entity, jsonText]);

  useEffect(() => {
    if (!open) {
      setJsonText("");
      setShowSkeleton(true);
    }
  }, [open]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    setJsonText(text);
    event.target.value = "";
  };

  const handleApply = async () => {
    if (!validation.ok) {
      return;
    }

    const parsed = parseEntityRecordsImportText(jsonText);
    if (!parsed.ok) {
      return;
    }

    const body = JSON.parse(jsonText) as unknown;
    await onApply(body);
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={triggerSize}
        onClick={() => setOpen(true)}
      >
        {labels.importTrigger}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={labels.importTitle}
        size="xl"
        scrollable
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {labels.cancel}
            </Button>
            <Button
              type="button"
              disabled={!validation.ok}
              loading={applying}
              onClick={() => void handleApply()}
            >
              {labels.apply}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Text className="text-muted-foreground text-sm">
            {labels.importDescription}
          </Text>

          <div className="flex flex-col gap-2">
            <Text className="text-sm font-medium">{labels.pasteLabel}</Text>
            <textarea
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[220px] w-full rounded-md border px-3 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(event) => void handleFileChange(event)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              {labels.uploadLabel}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Text className="text-sm font-medium">
                {labels.skeletonTitle}
              </Text>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSkeleton((current) => !current)}
              >
                {showSkeleton ? labels.skeletonHide : labels.skeletonShow}
              </Button>
            </div>
            {showSkeleton ? (
              <>
                <pre className="bg-muted max-h-48 overflow-auto rounded-md p-3 font-mono text-xs">
                  {skeleton}
                </pre>
                <div className="flex flex-col gap-2">
                  <Text className="text-sm font-medium">
                    {t("entity.recordsJson.schemaNotes.title")}
                  </Text>
                  <pre className="bg-muted max-h-64 overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap">
                    {schemaNotesText}
                  </pre>
                </div>
              </>
            ) : null}
          </div>

          {jsonText.trim().length > 0 ? (
            <div className="flex flex-col gap-2">
              {validation.ok ? (
                <Text className="text-sm text-green-600 dark:text-green-400">
                  {labels.valid}
                </Text>
              ) : (
                <JsonImportErrors
                  errors={"errors" in validation ? validation.errors : []}
                  invalidLabel={labels.invalid}
                />
              )}
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
