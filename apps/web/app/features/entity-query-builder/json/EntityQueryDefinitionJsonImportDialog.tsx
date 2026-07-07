import { useEffect, useMemo, useRef, useState } from "react";
import {
  validateEntityQueryDefinitionImport,
  type EntityQueryDefinitionFormData,
} from "@repo/entity-queries/browser";
import {
  Button,
  JsonImportTriggerButton,
  Modal,
  Text,
  type JsonActionTriggerLabels,
} from "@repo/ui";

import { JsonImportErrors } from "../../../components/data-models/json/JsonImportErrors.js";
import type { EntityQueryDefinitionFormJsonLabels } from "./entity-query-definition-json-labels.js";
import { createEntityQueryDefinitionImportExampleEnvelope } from "./entity-query-definition-json-examples.js";
import { normalizeImportedEntityQueryDefinitionForEdit } from "./normalize-imported-entity-query-definition.js";

interface EntityQueryDefinitionJsonImportDialogProps {
  readonly existingName: string;
  readonly existingSourceEntity: string;
  readonly canApply: boolean;
  readonly labels: EntityQueryDefinitionFormJsonLabels;
  readonly onApply: (data: EntityQueryDefinitionFormData) => void;
  readonly triggerLabels?: JsonActionTriggerLabels;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function EntityQueryDefinitionJsonImportDialog({
  existingName,
  existingSourceEntity,
  canApply,
  labels,
  onApply,
  triggerLabels,
  open: openProp,
  onOpenChange,
}: EntityQueryDefinitionJsonImportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [jsonText, setJsonText] = useState("");
  const [showSkeleton, setShowSkeleton] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const skeleton = useMemo(
    () =>
      JSON.stringify(
        createEntityQueryDefinitionImportExampleEnvelope({
          name: existingName,
          sourceEntity: existingSourceEntity,
        }),
        null,
        2,
      ),
    [existingName, existingSourceEntity],
  );

  const validation = useMemo(() => {
    if (jsonText.trim().length === 0) {
      return {
        ok: false as const,
        errors: [] as const,
        preservedIdentityFields: [] as const,
      };
    }

    const parsed = validateEntityQueryDefinitionImport(jsonText);
    if (!parsed.ok) {
      return parsed;
    }

    const normalized = normalizeImportedEntityQueryDefinitionForEdit({
      data: parsed.data,
      existingName,
      existingSourceEntity,
    });

    return {
      ok: true as const,
      data: normalized.data,
      preservedIdentityFields: normalized.preservedIdentityFields,
    };
  }, [existingName, existingSourceEntity, jsonText]);

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

  const handleApply = () => {
    if (!validation.ok || !canApply) {
      return;
    }
    onApply(validation.data);
    setOpen(false);
  };

  return (
    <>
      {openProp === undefined ? (
        <JsonImportTriggerButton
          labels={triggerLabels}
          onClick={() => setOpen(true)}
        />
      ) : null}

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
              disabled={!validation.ok || !canApply}
              onClick={handleApply}
            >
              {labels.apply}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {!canApply ? (
            <Text className="text-muted-foreground text-sm">
              {labels.readOnlyHint}
            </Text>
          ) : null}

          <Text className="text-muted-foreground text-sm">
            {labels.importDescriptionEdit}
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
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canApply}
                  onClick={() => setJsonText(skeleton)}
                >
                  {labels.fillExample}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSkeleton((current) => !current)}
                >
                  {showSkeleton ? labels.skeletonHide : labels.skeletonShow}
                </Button>
              </div>
            </div>
            {showSkeleton ? (
              <pre className="bg-muted max-h-48 overflow-auto rounded-md p-3 font-mono text-xs">
                {skeleton}
              </pre>
            ) : null}
          </div>

          {jsonText.trim().length > 0 ? (
            <div className="flex flex-col gap-2">
              {validation.ok ? (
                <>
                  <Text className="text-sm text-green-600 dark:text-green-400">
                    {labels.valid}
                  </Text>
                  {validation.preservedIdentityFields.length > 0 ? (
                    <Text className="text-muted-foreground text-sm">
                      {labels.identityPreservedNotice}
                    </Text>
                  ) : null}
                </>
              ) : (
                <JsonImportErrors
                  errors={validation.errors}
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
