import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  createEmailMatchBindingEnvelope,
  parseEmailMatchBindingJson,
  toPortableEmailMatchBinding,
} from "@repo/gmail-ingest/browser";
import { CollapsibleEditorCard } from "@repo/ui-builder-react";
import {
  Button,
  Checkbox,
  FieldLabel,
  JsonImportTriggerButton,
  JsonViewTriggerButton,
  Modal,
  SegmentedSwitch,
  Text,
  Textarea,
  toast,
} from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";

import { formatRecordDisplayLabel } from "../../components/entity/format-record-display-label";
import { RelationPicker } from "../../components/entity/RelationPicker";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { tryGetEntityDefinition } from "../../entities/entity-catalog";
import { JsonImportErrors } from "../../components/data-models/json/JsonImportErrors";
import { getEntity } from "../../lib/api-client";
import {
  designerPreviewPanelBodyFillClassName,
  designerPreviewPanelHeaderClassName,
  designerPreviewPanelShellClassName,
  designerPreviewPanelShellFillClassName,
} from "../ui-builder/designer-tree-workbench-classes";
import { EmailExtractorFieldLabel } from "./EmailExtractorFieldHelp";
import {
  bindingDisplayName,
  emptyExtractorRow,
  extractorToFormRow,
  extractorsToPayload,
  splitLines,
  type ExtractorFormRow,
  type ExtractorSourceMode,
  type ExtractorTransform,
} from "./email-matching-draft";
import { useEmailMatching } from "./email-matching-context";

const controlClassName =
  "border-input bg-background flex h-9 w-full rounded-md border px-3 py-1.5 text-sm";
const textareaClassName =
  "border-input bg-background flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm";

/** Extractor literal fields that map to relation targets even when not on the binding entity. */
const LITERAL_RELATION_FIELD_TARGETS: Readonly<Record<string, string>> = {
  relatedFinancialItemId: "financialItem",
  hubFinancialItemId: "financialItem",
  financialItemId: "financialItem",
  accountId: "account",
  categoryId: "category",
  paymentScheduleId: "paymentSchedule",
};

function literalRelationTarget(
  fieldName: string,
  entityDefinition:
    | {
        readonly fields?: Readonly<
          Record<string, { readonly relation?: { readonly target?: string } }>
        >;
      }
    | undefined,
): string | null {
  const trimmed = fieldName.trim();
  if (!trimmed) {
    return null;
  }
  const fromMap = LITERAL_RELATION_FIELD_TARGETS[trimmed];
  if (fromMap) {
    return fromMap;
  }
  if (!entityDefinition?.fields) {
    return null;
  }
  const target = entityDefinition.fields[trimmed]?.relation?.target;
  return typeof target === "string" && target.trim().length > 0
    ? target.trim()
    : null;
}

export function EmailMatchingSettingsPanel() {
  const { t } = useTranslation("common");
  const { editor, canUpdate } = useEmailMatching();
  const { items: catalog } = useEntityCatalog();
  const [jsonViewOpen, setJsonViewOpen] = useState(false);
  const [jsonImportOpen, setJsonImportOpen] = useState(false);
  const [jsonImportText, setJsonImportText] = useState("");
  const [jsonImportErrors, setJsonImportErrors] = useState<
    readonly { path: string; message: string }[]
  >([]);

  const binding = editor.selectedBinding;
  const draft = editor.draft;
  const readOnly = !canUpdate;

  const recordQuery = useQuery({
    queryKey: [
      "email-matching-settings-record",
      binding?.entityName,
      binding?.recordId,
    ] as const,
    queryFn: () =>
      getEntity<Record<string, unknown>>(
        binding!.entityName,
        binding!.recordId,
      ),
    enabled: Boolean(binding?.entityName && binding?.recordId),
    staleTime: 60_000,
  });

  const recordName = useMemo(() => {
    if (!binding || !recordQuery.data) {
      return null;
    }
    const definition = tryGetEntityDefinition(binding.entityName, catalog);
    return formatRecordDisplayLabel(recordQuery.data, definition?.displayField);
  }, [binding, catalog, recordQuery.data]);

  const entityDefinition = useMemo(
    () =>
      binding ? tryGetEntityDefinition(binding.entityName, catalog) : undefined,
    [binding, catalog],
  );

  const exportJson = useMemo(() => {
    if (!binding || !draft) {
      return "";
    }
    const extractors = extractorsToPayload(draft.bodyFieldExtractors) ?? [];
    const envelope = createEmailMatchBindingEnvelope(
      toPortableEmailMatchBinding({
        entityName: binding.entityName,
        recordId: binding.recordId,
        name: draft.name.trim() || null,
        description: draft.description.trim() || null,
        enabled: draft.enabled,
        order: draft.order,
        ingestMode: draft.ingestMode,
        fromAddresses: splitLines(draft.fromAddresses),
        subjectPatterns: splitLines(draft.subjectPatterns),
        bodyPatterns: splitLines(draft.bodyPatterns),
        gmailQueryExtra: draft.gmailQueryExtra.trim() || null,
        useAi: draft.useAi,
        aiInstructions: draft.aiInstructions.trim() || null,
        bodyFieldExtractors: extractors.map((extractor) => ({
          field: extractor.field,
          label: extractor.label ?? "",
          pattern: extractor.pattern,
          captureGroup: extractor.captureGroup,
          transform: extractor.transform,
          valueMap: extractor.valueMap ? { ...extractor.valueMap } : undefined,
          literal: extractor.literal,
          sufficientForRelevance: extractor.sufficientForRelevance,
        })),
        attachmentImport: draft.attachmentImport?.enabled
          ? {
              enabled: true,
              documentType: draft.attachmentImport.documentType,
              ...(draft.attachmentImport.documentDateField
                ? {
                    documentDateField: draft.attachmentImport.documentDateField,
                  }
                : {}),
              ...(draft.attachmentImport.recordIdField
                ? { recordIdField: draft.attachmentImport.recordIdField }
                : {}),
            }
          : null,
      }),
    );
    return JSON.stringify(envelope, null, 2);
  }, [binding, draft]);

  if (!binding || !draft) {
    return (
      <div
        className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName}`}
      >
        <Text className="text-muted-foreground text-sm">
          {t("emailMatchingWorkbench.settings.empty")}
        </Text>
      </div>
    );
  }

  async function handleSave() {
    const error = await editor.saveSelectedBinding();
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("emailMatchingWorkbench.settings.saved"));
  }

  function updateExtractor(
    index: number,
    patch: Partial<ExtractorFormRow>,
  ): void {
    if (!draft) {
      return;
    }
    editor.updateDraft({
      bodyFieldExtractors: draft.bodyFieldExtractors.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    });
  }

  function applyJsonImport(): void {
    if (!binding) {
      return;
    }
    const parsed = parseEmailMatchBindingJson(jsonImportText);
    if (!parsed.ok) {
      setJsonImportErrors(
        parsed.errors.map((error) => ({
          path: error.path,
          message: error.message,
        })),
      );
      return;
    }
    const portable = parsed.data;
    if (portable.entityName !== binding.entityName) {
      setJsonImportErrors([
        {
          path: "data.entityName",
          message: t("platform.email.json.entityMismatch"),
        },
      ]);
      return;
    }
    if (portable.recordId !== binding.recordId) {
      setJsonImportErrors([
        {
          path: "data.recordId",
          message: t("platform.email.json.recordMismatch"),
        },
      ]);
      return;
    }
    editor.applyImportedDraft({
      name: portable.name ?? "",
      description: portable.description ?? "",
      enabled: portable.enabled ?? true,
      order: portable.order ?? 100,
      ingestMode: portable.ingestMode ?? "create",
      catchupNeeded: false,
      fromAddresses: (portable.fromAddresses ?? []).join("\n"),
      subjectPatterns: (portable.subjectPatterns ?? []).join("\n"),
      bodyPatterns: (portable.bodyPatterns ?? []).join("\n"),
      gmailQueryExtra: portable.gmailQueryExtra ?? "",
      useAi: portable.useAi ?? false,
      aiInstructions: portable.aiInstructions ?? "",
      bodyFieldExtractors: (portable.bodyFieldExtractors ?? []).map(
        extractorToFormRow,
      ),
      attachmentImport: portable.attachmentImport
        ? {
            enabled: portable.attachmentImport.enabled,
            documentType: portable.attachmentImport.documentType ?? "",
            documentDateField:
              portable.attachmentImport.documentDateField ?? "",
            recordIdField: portable.attachmentImport.recordIdField ?? "",
          }
        : null,
    });
    setJsonImportOpen(false);
    setJsonImportText("");
    setJsonImportErrors([]);
    toast.success(t("platform.email.json.appliedToForm"));
  }

  return (
    <div
      className={`${designerPreviewPanelShellClassName} ${designerPreviewPanelShellFillClassName}`}
    >
      <div className={designerPreviewPanelHeaderClassName}>
        <div className="min-w-0">
          <Text className="text-foreground text-base font-semibold">
            {bindingDisplayName(binding)}
          </Text>
          <Text className="text-muted-foreground text-xs">
            {binding.entityName}
            {recordName ? ` · ${recordName}` : ""} ·{" "}
            {binding.recordId.slice(0, 8)}…
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <JsonViewTriggerButton onClick={() => setJsonViewOpen(true)} />
          <JsonImportTriggerButton
            onClick={() => setJsonImportOpen(true)}
            disabled={readOnly}
          />
          <Button
            type="button"
            loading={editor.isSaving}
            disabled={readOnly || !editor.isDirty}
            onClick={() => void handleSave()}
          >
            {t("emailMatchingWorkbench.settings.save")}
          </Button>
        </div>
      </div>

      <div className={designerPreviewPanelBodyFillClassName}>
        <div className="space-y-4">
          <CollapsibleEditorCard
            title={t("emailMatchingWorkbench.settings.sections.metadata")}
            defaultOpen
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <FieldLabel htmlFor="email-matching-settings-name">
                  {t("emailMatchingWorkbench.fields.name")}
                </FieldLabel>
                <input
                  id="email-matching-settings-name"
                  className={controlClassName}
                  value={draft.name}
                  disabled={readOnly}
                  onChange={(event) =>
                    editor.updateDraft({ name: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <FieldLabel>
                  {t("emailMatchingWorkbench.settings.status")}
                </FieldLabel>
                <Select
                  className={controlClassName}
                  value={draft.enabled ? "enabled" : "disabled"}
                  disabled={readOnly}
                  onChange={(event) =>
                    editor.updateDraft({
                      enabled: event.target.value === "enabled",
                    })
                  }
                >
                  <option value="enabled">
                    {t("emailMatchingWorkbench.settings.enabled")}
                  </option>
                  <option value="disabled">
                    {t("emailMatchingWorkbench.settings.disabled")}
                  </option>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="email-matching-settings-description">
                {t("emailMatchingWorkbench.fields.description")}
              </FieldLabel>
              <textarea
                id="email-matching-settings-description"
                className={textareaClassName}
                value={draft.description}
                disabled={readOnly}
                onChange={(event) =>
                  editor.updateDraft({ description: event.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <FieldLabel>
                {t("emailMatchingWorkbench.fields.targetRecord")}
              </FieldLabel>
              {recordName ? (
                <Text className="text-foreground text-sm">{recordName}</Text>
              ) : null}
              <Text className="text-muted-foreground text-sm">
                {binding.entityName} / {binding.recordId}
              </Text>
              <Link
                to={`/app/${encodeURIComponent(binding.entityName)}/${encodeURIComponent(binding.recordId)}`}
                className="text-primary text-sm font-medium"
              >
                {t("emailMatchingWorkbench.settings.openRecord")}
              </Link>
            </div>
          </CollapsibleEditorCard>

          <CollapsibleEditorCard
            title={t("emailMatchingWorkbench.settings.sections.matching")}
            defaultOpen
          >
            <div className="space-y-3">
              <div className="space-y-1">
                <FieldLabel htmlFor="email-matching-from">
                  {t("platform.email.fromAddresses")}
                </FieldLabel>
                <textarea
                  id="email-matching-from"
                  className={textareaClassName}
                  value={draft.fromAddresses}
                  disabled={readOnly}
                  onChange={(event) =>
                    editor.updateDraft({ fromAddresses: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="email-matching-subject">
                  {t("platform.email.subjectPatterns")}
                </FieldLabel>
                <textarea
                  id="email-matching-subject"
                  className={textareaClassName}
                  value={draft.subjectPatterns}
                  disabled={readOnly}
                  onChange={(event) =>
                    editor.updateDraft({
                      subjectPatterns: event.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="email-matching-body">
                  {t("platform.email.bodyPatterns")}
                </FieldLabel>
                <textarea
                  id="email-matching-body"
                  className={textareaClassName}
                  value={draft.bodyPatterns}
                  disabled={readOnly}
                  onChange={(event) =>
                    editor.updateDraft({ bodyPatterns: event.target.value })
                  }
                />
                <Text className="text-muted-foreground text-xs">
                  {t("platform.email.bodyPatternsHint")}
                </Text>
              </div>
            </div>
          </CollapsibleEditorCard>

          <CollapsibleEditorCard
            title={t("emailMatchingWorkbench.settings.sections.ingest")}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <FieldLabel>
                  {t("emailMatchingWorkbench.fields.ingestMode")}
                </FieldLabel>
                <Select
                  className={controlClassName}
                  value={draft.ingestMode}
                  disabled={readOnly}
                  onChange={(event) =>
                    editor.updateDraft({
                      ingestMode: event.target.value as "create" | "link",
                    })
                  }
                >
                  <option value="create">
                    {t("emailMatchingWorkbench.list.ingestCreate")}
                  </option>
                  <option value="link">
                    {t("emailMatchingWorkbench.list.ingestLink")}
                  </option>
                </Select>
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="email-matching-order">
                  {t("emailMatchingWorkbench.fields.order")}
                </FieldLabel>
                <input
                  id="email-matching-order"
                  type="number"
                  className={controlClassName}
                  value={draft.order}
                  disabled={readOnly}
                  onChange={(event) =>
                    editor.updateDraft({
                      order: Number(event.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="mt-3 space-y-3">
              <Checkbox
                id="email-matching-catchup"
                checked={draft.catchupNeeded}
                disabled={readOnly}
                onChange={(event) =>
                  editor.updateDraft({
                    catchupNeeded: event.target.checked,
                  })
                }
                label={t("emailMatchingWorkbench.fields.catchupNeeded")}
              />
              <div className="space-y-1">
                <FieldLabel htmlFor="email-matching-gmail-extra">
                  {t("emailMatchingWorkbench.fields.gmailQueryExtra")}
                </FieldLabel>
                <input
                  id="email-matching-gmail-extra"
                  className={controlClassName}
                  value={draft.gmailQueryExtra}
                  disabled={readOnly}
                  onChange={(event) =>
                    editor.updateDraft({
                      gmailQueryExtra: event.target.value,
                    })
                  }
                />
              </div>
            </div>
          </CollapsibleEditorCard>

          <CollapsibleEditorCard
            title={t("emailMatchingWorkbench.settings.sections.extractors")}
            defaultOpen
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Text className="text-muted-foreground text-xs">
                  {t("platform.email.bodyFieldExtractorsHint")}
                </Text>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={readOnly}
                  onClick={() =>
                    editor.updateDraft({
                      bodyFieldExtractors: [
                        ...draft.bodyFieldExtractors,
                        emptyExtractorRow(),
                      ],
                    })
                  }
                >
                  {t("platform.email.addBodyFieldExtractor")}
                </Button>
              </div>
              {draft.bodyFieldExtractors.length === 0 ? (
                <Text className="text-muted-foreground text-sm">
                  {t("platform.email.noBodyFieldExtractors")}
                </Text>
              ) : (
                draft.bodyFieldExtractors.map((row, index) => {
                  const relationTarget = literalRelationTarget(
                    row.field,
                    entityDefinition,
                  );
                  const fieldTitle = row.field.trim()
                    ? row.field.trim()
                    : t("platform.email.extractorUntitled", {
                        index: index + 1,
                      });
                  const sourceHint =
                    row.transform === "literal"
                      ? "literal"
                      : row.sourceMode === "pattern"
                        ? t("platform.email.extractorSourceModePattern")
                        : t("platform.email.extractorSourceModeLabel");
                  const cardTitle = `${fieldTitle} · ${sourceHint}`;

                  return (
                    <CollapsibleEditorCard
                      key={`extractor-${String(index)}`}
                      title={cardTitle}
                      defaultOpen={!row.field.trim()}
                      headerEnd={
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={readOnly}
                          onClick={() =>
                            editor.updateDraft({
                              bodyFieldExtractors:
                                draft.bodyFieldExtractors.filter(
                                  (_row, rowIndex) => rowIndex !== index,
                                ),
                            })
                          }
                        >
                          {t("platform.email.removeBodyFieldExtractor")}
                        </Button>
                      }
                    >
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <FieldLabel>
                              {t("platform.email.extractorField")}
                            </FieldLabel>
                            <input
                              className={controlClassName}
                              value={row.field}
                              disabled={readOnly}
                              onChange={(event) =>
                                updateExtractor(index, {
                                  field: event.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>
                              {t("platform.email.extractorTransform")}
                            </FieldLabel>
                            <Select
                              className={controlClassName}
                              value={row.transform}
                              disabled={readOnly}
                              onChange={(event) =>
                                updateExtractor(index, {
                                  transform: event.target
                                    .value as ExtractorTransform,
                                })
                              }
                            >
                              <option value="trim">trim</option>
                              <option value="amount">amount</option>
                              <option value="slashDate">slashDate</option>
                              <option value="compactYmd">compactYmd</option>
                              <option value="monthNameDate">
                                monthNameDate
                              </option>
                              <option value="valueMap">valueMap</option>
                              <option value="literal">literal</option>
                            </Select>
                          </div>
                          {row.transform !== "literal" ? (
                            <div className="space-y-1 sm:col-span-2">
                              <FieldLabel>
                                {t("platform.email.extractorSourceMode")}
                              </FieldLabel>
                              <div className="w-full sm:w-1/2">
                                <SegmentedSwitch<ExtractorSourceMode>
                                  value={row.sourceMode}
                                  ariaLabel={t(
                                    "platform.email.extractorSourceMode",
                                  )}
                                  fullWidth
                                  className={
                                    readOnly
                                      ? "pointer-events-none opacity-60"
                                      : undefined
                                  }
                                  options={[
                                    {
                                      value: "label",
                                      label: t(
                                        "platform.email.extractorSourceModeLabel",
                                      ),
                                      ariaLabel: t(
                                        "platform.email.extractorSourceModeLabel",
                                      ),
                                    },
                                    {
                                      value: "pattern",
                                      label: t(
                                        "platform.email.extractorSourceModePattern",
                                      ),
                                      ariaLabel: t(
                                        "platform.email.extractorSourceModePattern",
                                      ),
                                    },
                                  ]}
                                  onChange={(sourceMode) => {
                                    if (readOnly) {
                                      return;
                                    }
                                    updateExtractor(
                                      index,
                                      sourceMode === "pattern"
                                        ? {
                                            sourceMode,
                                            label: "",
                                          }
                                        : {
                                            sourceMode,
                                            pattern: "",
                                            captureGroup: "",
                                          },
                                    );
                                  }}
                                />
                              </div>
                            </div>
                          ) : null}
                          {row.transform !== "literal" &&
                          row.sourceMode === "label" ? (
                            <div className="space-y-1 sm:col-span-2">
                              <EmailExtractorFieldLabel
                                label={t("platform.email.extractorLabel")}
                                fieldKey="label"
                              />
                              <input
                                className={controlClassName}
                                value={row.label}
                                disabled={readOnly}
                                onChange={(event) =>
                                  updateExtractor(index, {
                                    label: event.target.value,
                                  })
                                }
                              />
                            </div>
                          ) : null}
                          {row.transform !== "literal" &&
                          row.sourceMode === "pattern" ? (
                            <>
                              <div className="space-y-1">
                                <EmailExtractorFieldLabel
                                  label={t("platform.email.extractorPattern")}
                                  fieldKey="pattern"
                                />
                                <input
                                  className={controlClassName}
                                  value={row.pattern}
                                  disabled={readOnly}
                                  onChange={(event) =>
                                    updateExtractor(index, {
                                      pattern: event.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <EmailExtractorFieldLabel
                                  label={t(
                                    "platform.email.extractorCaptureGroup",
                                  )}
                                  fieldKey="captureGroup"
                                />
                                <input
                                  className={controlClassName}
                                  value={row.captureGroup}
                                  disabled={readOnly}
                                  onChange={(event) =>
                                    updateExtractor(index, {
                                      captureGroup: event.target.value,
                                    })
                                  }
                                />
                              </div>
                            </>
                          ) : null}
                          {row.transform === "valueMap" ? (
                            <div className="space-y-1 sm:col-span-2">
                              <FieldLabel>
                                {t("platform.email.extractorValueMap")}
                              </FieldLabel>
                              <textarea
                                className={textareaClassName}
                                value={row.valueMapJson}
                                disabled={readOnly}
                                onChange={(event) =>
                                  updateExtractor(index, {
                                    valueMapJson: event.target.value,
                                  })
                                }
                              />
                            </div>
                          ) : null}
                          {row.transform === "literal" ? (
                            <div className="space-y-1 sm:col-span-2">
                              {relationTarget ? (
                                <RelationPicker
                                  entityName={binding.entityName}
                                  fieldName={row.field}
                                  targetEntity={relationTarget}
                                  value={row.literal || null}
                                  label={t(
                                    "platform.email.extractorLiteralRelation",
                                  )}
                                  readOnly={readOnly}
                                  onChange={(_field, value) =>
                                    updateExtractor(index, {
                                      literal:
                                        typeof value === "string" ? value : "",
                                    })
                                  }
                                />
                              ) : (
                                <>
                                  <FieldLabel>
                                    {t("platform.email.extractorLiteral")}
                                  </FieldLabel>
                                  <input
                                    className={controlClassName}
                                    value={row.literal}
                                    disabled={readOnly}
                                    onChange={(event) =>
                                      updateExtractor(index, {
                                        literal: event.target.value,
                                      })
                                    }
                                  />
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>
                        <Checkbox
                          id={`email-matching-sufficient-${String(index)}`}
                          checked={row.sufficientForRelevance}
                          disabled={readOnly}
                          onChange={(event) =>
                            updateExtractor(index, {
                              sufficientForRelevance: event.target.checked,
                            })
                          }
                          label={t(
                            "emailMatchingWorkbench.fields.sufficientForRelevance",
                          )}
                        />
                      </div>
                    </CollapsibleEditorCard>
                  );
                })
              )}
            </div>
          </CollapsibleEditorCard>

          <CollapsibleEditorCard
            title={t("emailMatchingWorkbench.settings.sections.ai")}
          >
            <div className="space-y-3">
              <Checkbox
                id="email-matching-use-ai"
                checked={draft.useAi}
                disabled={readOnly}
                onChange={(event) =>
                  editor.updateDraft({ useAi: event.target.checked })
                }
                label={t("platform.email.useAi")}
              />
              <div className="space-y-1">
                <FieldLabel htmlFor="email-matching-ai-instructions">
                  {t("platform.email.aiInstructions")}
                </FieldLabel>
                <textarea
                  id="email-matching-ai-instructions"
                  className={textareaClassName}
                  value={draft.aiInstructions}
                  disabled={readOnly || !draft.useAi}
                  onChange={(event) =>
                    editor.updateDraft({
                      aiInstructions: event.target.value,
                    })
                  }
                />
              </div>
            </div>
          </CollapsibleEditorCard>

          <CollapsibleEditorCard
            title={t("emailMatchingWorkbench.settings.sections.attachments")}
          >
            <div className="space-y-3">
              <Checkbox
                id="email-matching-attachment-enabled"
                checked={draft.attachmentImport?.enabled ?? false}
                disabled={readOnly}
                onChange={(event) =>
                  editor.updateDraft({
                    attachmentImport: {
                      enabled: event.target.checked,
                      documentType: draft.attachmentImport?.documentType ?? "",
                      documentDateField:
                        draft.attachmentImport?.documentDateField ?? "",
                      recordIdField:
                        draft.attachmentImport?.recordIdField ?? "",
                    },
                  })
                }
                label={t("emailMatchingWorkbench.fields.attachmentImport")}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldLabel>
                    {t("emailMatchingWorkbench.fields.documentType")}
                  </FieldLabel>
                  <input
                    className={controlClassName}
                    value={draft.attachmentImport?.documentType ?? ""}
                    disabled={readOnly || !draft.attachmentImport?.enabled}
                    onChange={(event) =>
                      editor.updateDraft({
                        attachmentImport: {
                          enabled: draft.attachmentImport?.enabled ?? true,
                          documentType: event.target.value,
                          documentDateField:
                            draft.attachmentImport?.documentDateField ?? "",
                          recordIdField:
                            draft.attachmentImport?.recordIdField ?? "",
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel>
                    {t("emailMatchingWorkbench.fields.documentDateField")}
                  </FieldLabel>
                  <input
                    className={controlClassName}
                    value={draft.attachmentImport?.documentDateField ?? ""}
                    disabled={readOnly || !draft.attachmentImport?.enabled}
                    onChange={(event) =>
                      editor.updateDraft({
                        attachmentImport: {
                          enabled: draft.attachmentImport?.enabled ?? true,
                          documentType:
                            draft.attachmentImport?.documentType ?? "",
                          documentDateField: event.target.value,
                          recordIdField:
                            draft.attachmentImport?.recordIdField ?? "",
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <FieldLabel>
                    {t("emailMatchingWorkbench.fields.recordIdField")}
                  </FieldLabel>
                  <input
                    className={controlClassName}
                    value={draft.attachmentImport?.recordIdField ?? ""}
                    disabled={readOnly || !draft.attachmentImport?.enabled}
                    onChange={(event) =>
                      editor.updateDraft({
                        attachmentImport: {
                          enabled: draft.attachmentImport?.enabled ?? true,
                          documentType:
                            draft.attachmentImport?.documentType ?? "",
                          documentDateField:
                            draft.attachmentImport?.documentDateField ?? "",
                          recordIdField: event.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </CollapsibleEditorCard>
        </div>
      </div>

      <Modal
        open={jsonViewOpen}
        onClose={() => setJsonViewOpen(false)}
        title={t("platform.email.json.viewItemTitle")}
        footer={
          <Button
            type="button"
            variant="outline"
            onClick={() => setJsonViewOpen(false)}
          >
            {t("platform.email.json.close")}
          </Button>
        }
      >
        <Textarea
          className="min-h-[320px] font-mono text-xs"
          readOnly
          value={exportJson}
        />
      </Modal>

      <Modal
        open={jsonImportOpen}
        onClose={() => {
          setJsonImportOpen(false);
          setJsonImportErrors([]);
        }}
        title={t("platform.email.json.importItemTitle")}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setJsonImportOpen(false);
                setJsonImportErrors([]);
              }}
            >
              {t("platform.email.json.close")}
            </Button>
            <Button type="button" onClick={applyJsonImport}>
              {t("platform.email.json.apply")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Text className="text-muted-foreground text-sm">
            {t("platform.email.json.importItemHint")}
          </Text>
          <Textarea
            className="min-h-[240px] font-mono text-xs"
            value={jsonImportText}
            onChange={(event) => setJsonImportText(event.target.value)}
          />
          <JsonImportErrors
            errors={jsonImportErrors}
            invalidLabel={t("platform.email.json.invalid")}
          />
        </div>
      </Modal>
    </div>
  );
}
