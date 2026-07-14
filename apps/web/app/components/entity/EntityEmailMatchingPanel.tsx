/* eslint-disable @typescript-eslint/ban-ts-comment -- TS 5.9 crashes on this file */
// @ts-nocheck
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEmailMatchBindingEnvelope,
  createEmailMatchBindingsEnvelope,
  parseEmailMatchBindingJson,
  parseEmailMatchBindingsJson,
  toPortableEmailMatchBinding,
  type PortableEmailMatchBinding,
} from "@repo/gmail-ingest/browser";
import {
  Button,
  FieldLabel,
  Input,
  JsonImportTriggerButton,
  JsonViewTriggerButton,
  Modal,
  Text,
  Textarea,
  toast,
} from "@repo/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  createEmailMatchBinding,
  deleteEmailMatchBinding,
  listEmailMatchBindings,
  patchEmailMatchBinding,
} from "../../lib/api-client";
import { JsonImportErrors } from "../data-models/json/JsonImportErrors";

function splitLines(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function joinLines(values: readonly string[] | undefined): string {
  return (values ?? []).join("\n");
}

function fromAddressesKey(addresses: readonly string[] | undefined): string {
  return [...(addresses ?? [])]
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join("|");
}

function patternsKey(patterns: readonly string[] | undefined): string {
  return [...(patterns ?? [])]
    .map((pattern) => pattern.trim())
    .filter(Boolean)
    .sort()
    .join("|");
}

function bindingUpsertKey(binding: {
  readonly entityName: string;
  readonly recordId: string;
  readonly fromAddresses?: readonly string[];
  readonly subjectPatterns?: readonly string[];
  readonly bodyPatterns?: readonly string[];
}): string {
  return [
    binding.entityName,
    binding.recordId,
    fromAddressesKey(binding.fromAddresses),
    patternsKey(binding.subjectPatterns),
    patternsKey(binding.bodyPatterns),
  ].join("\0");
}

interface ExtractorFormRow {
  readonly field: string;
  readonly label: string;
  readonly pattern: string;
  readonly captureGroup: string;
  readonly transform: "trim" | "amount" | "slashDate" | "valueMap" | "literal";
  readonly valueMapJson: string;
  readonly literal: string;
}

interface BindingFormState {
  readonly fromAddresses: string;
  readonly subjectPatterns: string;
  readonly bodyPatterns: string;
  readonly useAi: boolean;
  readonly aiInstructions: string;
  readonly bodyFieldExtractors: readonly ExtractorFormRow[];
  readonly enabled: boolean;
}

function emptyExtractorRow(): ExtractorFormRow {
  return {
    field: "",
    label: "",
    pattern: "",
    captureGroup: "",
    transform: "trim",
    valueMapJson: "",
    literal: "",
  };
}

function emptyForm(): BindingFormState {
  return {
    fromAddresses: "",
    subjectPatterns: "",
    bodyPatterns: "",
    useAi: false,
    aiInstructions: "",
    bodyFieldExtractors: [],
    enabled: true,
  };
}

function extractorsFromPortable(
  binding: PortableEmailMatchBinding,
): ExtractorFormRow[] {
  return (binding.bodyFieldExtractors ?? []).map((extractor) => ({
    field: extractor.field,
    label: extractor.label ?? "",
    pattern: extractor.pattern ?? "",
    captureGroup:
      extractor.captureGroup !== undefined
        ? String(extractor.captureGroup)
        : "",
    transform: extractor.transform ?? "trim",
    valueMapJson: extractor.valueMap
      ? JSON.stringify(extractor.valueMap, null, 2)
      : "",
    literal: extractor.literal ?? "",
  }));
}

function extractorsToPortable(
  rows: readonly ExtractorFormRow[],
): NonNullable<PortableEmailMatchBinding["bodyFieldExtractors"]> {
  return rows
    .map((row) => {
      const field = row.field.trim();
      if (!field) {
        return null;
      }
      if (row.transform === "literal") {
        const literal = row.literal.trim();
        if (!literal) {
          return null;
        }
        return {
          field,
          label: "",
          transform: "literal" as const,
          literal,
        };
      }
      const label = row.label.trim();
      const pattern = row.pattern.trim();
      if (!label && !pattern) {
        return null;
      }
      let valueMap: Record<string, string> | undefined;
      if (row.transform === "valueMap" && row.valueMapJson.trim()) {
        try {
          const parsed = JSON.parse(row.valueMapJson) as unknown;
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            valueMap = Object.fromEntries(
              Object.entries(parsed as Record<string, unknown>).map(
                ([key, value]) => [key, String(value)],
              ),
            );
          }
        } catch {
          valueMap = undefined;
        }
      }
      const captureGroupRaw = row.captureGroup.trim();
      const captureGroup =
        captureGroupRaw.length > 0 && /^\d+$/.test(captureGroupRaw)
          ? Number(captureGroupRaw)
          : undefined;
      return {
        field,
        label,
        ...(pattern ? { pattern } : {}),
        ...(captureGroup !== undefined ? { captureGroup } : {}),
        transform: row.transform,
        ...(valueMap ? { valueMap } : {}),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
}

function toPortableFromRecord(binding: {
  readonly entityName: string;
  readonly recordId: string;
  readonly enabled?: boolean;
  readonly fromAddresses?: readonly string[];
  readonly subjectPatterns?: readonly string[];
  readonly bodyPatterns?: readonly string[];
  readonly gmailQueryExtra?: string | null;
  readonly useAi?: boolean;
  readonly aiInstructions?: string | null;
  readonly bodyFieldExtractors?: readonly {
    readonly field: string;
    readonly label?: string;
    readonly pattern?: string;
    readonly captureGroup?: number;
    readonly transform?:
      | "trim"
      | "amount"
      | "slashDate"
      | "valueMap"
      | "literal";
    readonly valueMap?: Readonly<Record<string, string>>;
    readonly literal?: string;
  }[];
}): PortableEmailMatchBinding {
  return toPortableEmailMatchBinding({
    entityName: binding.entityName,
    recordId: binding.recordId,
    enabled: binding.enabled,
    fromAddresses: binding.fromAddresses,
    subjectPatterns: binding.subjectPatterns,
    bodyPatterns: binding.bodyPatterns,
    gmailQueryExtra: binding.gmailQueryExtra,
    useAi: binding.useAi,
    aiInstructions: binding.aiInstructions,
    bodyFieldExtractors: binding.bodyFieldExtractors?.map((extractor) => ({
      field: extractor.field,
      label: extractor.label ?? "",
      pattern: extractor.pattern,
      captureGroup: extractor.captureGroup,
      transform: extractor.transform,
      valueMap: extractor.valueMap ? { ...extractor.valueMap } : undefined,
      literal: extractor.literal,
    })),
  });
}

function formFromPortable(
  binding: PortableEmailMatchBinding,
): BindingFormState {
  return {
    fromAddresses: joinLines(binding.fromAddresses),
    subjectPatterns: joinLines(binding.subjectPatterns),
    bodyPatterns: joinLines(binding.bodyPatterns),
    useAi: binding.useAi ?? false,
    aiInstructions: binding.aiInstructions ?? "",
    bodyFieldExtractors: extractorsFromPortable(binding),
    enabled: binding.enabled ?? true,
  };
}

function portableFromForm(
  form: BindingFormState,
  entityName: string,
  recordId: string,
): PortableEmailMatchBinding {
  return toPortableEmailMatchBinding({
    entityName,
    recordId,
    fromAddresses: splitLines(form.fromAddresses),
    subjectPatterns: splitLines(form.subjectPatterns),
    bodyPatterns: splitLines(form.bodyPatterns),
    useAi: form.useAi,
    aiInstructions: form.aiInstructions.trim() || null,
    bodyFieldExtractors: extractorsToPortable(form.bodyFieldExtractors),
    enabled: form.enabled,
  });
}

function scopeErrors(
  bindings: readonly PortableEmailMatchBinding[],
  entityName: string,
  recordId: string,
  t: (key: string) => string,
): { path: string; message: string }[] {
  const errors: { path: string; message: string }[] = [];
  bindings.forEach((binding, index) => {
    const prefix = bindings.length === 1 ? "data" : `bindings.${String(index)}`;
    if (binding.entityName !== entityName) {
      errors.push({
        path: `${prefix}.entityName`,
        message: t("platform.email.json.entityMismatch"),
      });
    }
    if (binding.recordId !== recordId) {
      errors.push({
        path: `${prefix}.recordId`,
        message: t("platform.email.json.recordMismatch"),
      });
    }
  });
  return errors;
}

export function EntityEmailMatchingPanel(props: {
  readonly entityName: string;
  readonly recordId: string;
}) {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BindingFormState>(emptyForm);

  const [listViewOpen, setListViewOpen] = useState(false);
  const [listImportOpen, setListImportOpen] = useState(false);
  const [listImportText, setListImportText] = useState("");
  const listFileInputRef = useRef<HTMLInputElement>(null);

  const [itemViewOpen, setItemViewOpen] = useState(false);
  const [itemImportOpen, setItemImportOpen] = useState(false);
  const [itemImportText, setItemImportText] = useState("");
  const itemFileInputRef = useRef<HTMLInputElement>(null);

  const bindingsQuery = useQuery({
    queryKey: ["gmail-bindings", props.entityName, props.recordId],
    queryFn: () =>
      listEmailMatchBindings({
        entityName: props.entityName,
        recordId: props.recordId,
      }),
  });

  const bindings = useMemo(
    () => bindingsQuery.data?.items ?? [],
    [bindingsQuery.data?.items],
  );

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["gmail-bindings", props.entityName, props.recordId],
    });
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setItemViewOpen(false);
    setItemImportOpen(false);
    setItemImportText("");
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (bindingId: string) => {
    const match = bindings.find((binding) => binding.id === bindingId);
    if (!match) return;
    setEditingId(bindingId);
    setForm(formFromPortable(toPortableFromRecord(match)));
    setFormOpen(true);
  };

  const upsertPortable = async (portable: PortableEmailMatchBinding) => {
    const key = bindingUpsertKey({
      entityName: props.entityName,
      recordId: props.recordId,
      fromAddresses: portable.fromAddresses,
      subjectPatterns: portable.subjectPatterns,
      bodyPatterns: portable.bodyPatterns,
    });
    const match = bindings.find(
      (binding) =>
        bindingUpsertKey({
          entityName: binding.entityName,
          recordId: binding.recordId,
          fromAddresses: binding.fromAddresses,
          subjectPatterns: binding.subjectPatterns,
          bodyPatterns: binding.bodyPatterns,
        }) === key,
    );
    const payload = {
      fromAddresses: portable.fromAddresses ?? [],
      subjectPatterns: portable.subjectPatterns ?? [],
      bodyPatterns: portable.bodyPatterns ?? [],
      gmailQueryExtra: portable.gmailQueryExtra ?? null,
      useAi: portable.useAi ?? false,
      aiInstructions: portable.aiInstructions ?? null,
      bodyFieldExtractors: portable.bodyFieldExtractors ?? [],
      enabled: portable.enabled ?? true,
    };
    if (match) {
      return patchEmailMatchBinding(match.id, payload);
    }
    return createEmailMatchBinding({
      entityName: props.entityName,
      recordId: props.recordId,
      ...payload,
    });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createEmailMatchBinding({
        entityName: props.entityName,
        recordId: props.recordId,
        fromAddresses: splitLines(form.fromAddresses),
        subjectPatterns: splitLines(form.subjectPatterns),
        bodyPatterns: splitLines(form.bodyPatterns),
        useAi: form.useAi,
        aiInstructions: form.aiInstructions.trim() || null,
        bodyFieldExtractors: extractorsToPortable(form.bodyFieldExtractors),
        enabled: form.enabled,
      }),
    onSuccess: async () => {
      closeForm();
      await invalidate();
      toast.success(t("platform.email.bindingSaved"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: (bindingId: string) =>
      patchEmailMatchBinding(bindingId, {
        fromAddresses: splitLines(form.fromAddresses),
        subjectPatterns: splitLines(form.subjectPatterns),
        bodyPatterns: splitLines(form.bodyPatterns),
        useAi: form.useAi,
        aiInstructions: form.aiInstructions.trim() || null,
        bodyFieldExtractors: extractorsToPortable(form.bodyFieldExtractors),
        enabled: form.enabled,
      }),
    onSuccess: async () => {
      closeForm();
      await invalidate();
      toast.success(t("platform.email.bindingSaved"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (input: { id: string; enabled: boolean }) =>
      patchEmailMatchBinding(input.id, { enabled: input.enabled }),
    onSuccess: async () => {
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmailMatchBinding,
    onSuccess: async (_result, bindingId) => {
      if (editingId === bindingId) {
        closeForm();
      }
      await invalidate();
      toast.success(t("platform.email.bindingDeleted"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const listImportMutation = useMutation({
    mutationFn: async (portables: readonly PortableEmailMatchBinding[]) => {
      for (const portable of portables) {
        await upsertPortable(portable);
      }
    },
    onSuccess: async () => {
      setListImportOpen(false);
      setListImportText("");
      await invalidate();
      toast.success(t("platform.email.bindingsImported"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const listViewJsonText = useMemo(() => {
    const portableBindings = bindings.map((binding) =>
      toPortableFromRecord(binding),
    );
    if (portableBindings.length === 0) {
      return JSON.stringify(
        {
          kind: "email-match-bindings",
          version: 1,
          exportedAt: new Date().toISOString(),
          bindings: [],
        },
        null,
        2,
      );
    }
    return JSON.stringify(
      createEmailMatchBindingsEnvelope(portableBindings),
      null,
      2,
    );
  }, [bindings]);

  const listImportValidation = useMemo(() => {
    if (!listImportText.trim()) {
      return {
        ok: false as const,
        errors: [] as { path: string; message: string }[],
      };
    }
    const parsed = parseEmailMatchBindingsJson(listImportText);
    if (!parsed.ok) {
      return parsed;
    }
    const errors = scopeErrors(
      parsed.data,
      props.entityName,
      props.recordId,
      t,
    );
    if (errors.length > 0) {
      return { ok: false as const, errors };
    }
    return { ok: true as const, data: parsed.data };
  }, [listImportText, props.entityName, props.recordId, t]);

  const itemViewJsonText = useMemo(
    () =>
      JSON.stringify(
        createEmailMatchBindingEnvelope(
          portableFromForm(form, props.entityName, props.recordId),
        ),
        null,
        2,
      ),
    [form, props.entityName, props.recordId],
  );

  const itemImportValidation = useMemo(() => {
    if (!itemImportText.trim()) {
      return {
        ok: false as const,
        errors: [] as { path: string; message: string }[],
      };
    }
    const parsed = parseEmailMatchBindingJson(itemImportText);
    if (!parsed.ok) {
      return parsed;
    }
    const errors = scopeErrors(
      [parsed.data],
      props.entityName,
      props.recordId,
      t,
    );
    if (errors.length > 0) {
      return { ok: false as const, errors };
    }
    return parsed;
  }, [itemImportText, props.entityName, props.recordId, t]);

  useEffect(() => {
    if (!listImportOpen) {
      setListImportText("");
    }
  }, [listImportOpen]);

  useEffect(() => {
    if (!itemImportOpen) {
      setItemImportText("");
    }
  }, [itemImportOpen]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <section className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Text className="font-medium">
            {t("platform.email.recordPanelTitle")}
          </Text>
          <Text className="text-muted-foreground text-sm">
            {t("platform.email.recordPanelHint")}
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <JsonViewTriggerButton onClick={() => setListViewOpen(true)} />
          <JsonImportTriggerButton onClick={() => setListImportOpen(true)} />
          <Button type="button" onClick={openCreate}>
            {t("platform.email.addBinding")}
          </Button>
        </div>
      </div>

      {bindings.length === 0 ? (
        <Text className="text-muted-foreground text-sm">
          {t("platform.email.noBindings")}
        </Text>
      ) : (
        <ul className="space-y-2">
          {bindings.map((binding) => (
            <li
              key={binding.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b py-2"
            >
              <div className="min-w-0 space-y-1">
                <Text className="text-sm">
                  {binding.fromAddresses.join(", ") || "—"} ·{" "}
                  {binding.enabled
                    ? t("platform.email.enabled")
                    : t("platform.email.disabled")}
                </Text>
                {binding.subjectPatterns.length > 0 ? (
                  <Text className="text-muted-foreground text-xs">
                    {binding.subjectPatterns.join(", ")}
                  </Text>
                ) : null}
                {binding.bodyPatterns.length > 0 ? (
                  <Text className="text-muted-foreground text-xs">
                    {t("platform.email.bodyPatterns")}:{" "}
                    {binding.bodyPatterns.join(", ")}
                  </Text>
                ) : null}
                {binding.useAi ? (
                  <Text className="text-muted-foreground text-xs">
                    {t("platform.email.aiEnabled")}
                  </Text>
                ) : (binding.bodyFieldExtractors?.length ?? 0) > 0 ? (
                  <Text className="text-muted-foreground text-xs">
                    {t("platform.email.bodyExtractEnabled", {
                      count: binding.bodyFieldExtractors?.length ?? 0,
                    })}
                  </Text>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(binding.id)}
                >
                  {t("platform.email.editBinding")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toggleMutation.mutate({
                      id: binding.id,
                      enabled: !binding.enabled,
                    })
                  }
                >
                  {binding.enabled
                    ? t("platform.email.disable")
                    : t("platform.email.enable")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteMutation.mutate(binding.id)}
                >
                  {t("platform.email.deleteBinding")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={
          editingId
            ? t("platform.email.editBindingTitle")
            : t("platform.email.addBindingTitle")
        }
        size="lg"
        scrollable
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeForm}>
              {t("platform.email.cancelEdit")}
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              onClick={() => {
                if (editingId) {
                  updateMutation.mutate(editingId);
                } else {
                  createMutation.mutate();
                }
              }}
            >
              {editingId
                ? t("platform.email.updateBinding")
                : t("platform.email.saveBinding")}
            </Button>
          </>
        }
      >
        <div className="mb-3 flex flex-wrap justify-end gap-2">
          <JsonViewTriggerButton onClick={() => setItemViewOpen(true)} />
          <JsonImportTriggerButton onClick={() => setItemImportOpen(true)} />
        </div>
        <div className="space-y-2">
          <FieldLabel>{t("platform.email.fromAddresses")}</FieldLabel>
          <Textarea
            value={form.fromAddresses}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                fromAddresses: event.target.value,
              }))
            }
            placeholder="alerts@bank.com, @amex.com"
          />
          <FieldLabel>{t("platform.email.subjectPatterns")}</FieldLabel>
          <Textarea
            value={form.subjectPatterns}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                subjectPatterns: event.target.value,
              }))
            }
            placeholder="purchase, /pago\\s+#\\d+/"
          />
          <FieldLabel>{t("platform.email.bodyPatterns")}</FieldLabel>
          <Textarea
            value={form.bodyPatterns}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                bodyPatterns: event.target.value,
              }))
            }
            placeholder={"****7185\n/Respuesta:\\s*Aprobado\\(a\\)/"}
          />
          <Text className="text-muted-foreground text-xs">
            {t("platform.email.bodyPatternsHint")}
          </Text>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  enabled: event.target.checked,
                }))
              }
            />
            {t("platform.email.enabled")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.useAi}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  useAi: event.target.checked,
                }))
              }
            />
            {t("platform.email.useAi")}
          </label>
          {form.useAi ? (
            <>
              <FieldLabel>{t("platform.email.aiInstructions")}</FieldLabel>
              <Textarea
                value={form.aiInstructions}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    aiInstructions: event.target.value,
                  }))
                }
              />
            </>
          ) : (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <FieldLabel className="mb-0">
                  {t("platform.email.bodyFieldExtractors")}
                </FieldLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      bodyFieldExtractors: [
                        ...current.bodyFieldExtractors,
                        emptyExtractorRow(),
                      ],
                    }))
                  }
                >
                  {t("platform.email.addBodyFieldExtractor")}
                </Button>
              </div>
              <Text className="text-muted-foreground text-xs">
                {t("platform.email.bodyFieldExtractorsHint")}
              </Text>
              {form.bodyFieldExtractors.length === 0 ? (
                <Text className="text-muted-foreground text-xs">
                  {t("platform.email.noBodyFieldExtractors")}
                </Text>
              ) : (
                form.bodyFieldExtractors.map((row, index) => (
                  <div
                    key={`extractor-${String(index)}`}
                    className="space-y-2 rounded-md border p-2"
                  >
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div>
                        <FieldLabel>
                          {t("platform.email.extractorField")}
                        </FieldLabel>
                        <Input
                          value={row.field}
                          placeholder="amount"
                          onChange={(event) => {
                            const value = event.target.value;
                            setForm((current) => ({
                              ...current,
                              bodyFieldExtractors:
                                current.bodyFieldExtractors.map(
                                  (entry, entryIndex) =>
                                    entryIndex === index
                                      ? { ...entry, field: value }
                                      : entry,
                                ),
                            }));
                          }}
                        />
                      </div>
                      <div>
                        <FieldLabel>
                          {t("platform.email.extractorLabel")}
                        </FieldLabel>
                        <Input
                          value={row.label}
                          placeholder="Valor Transacción"
                          onChange={(event) => {
                            const value = event.target.value;
                            setForm((current) => ({
                              ...current,
                              bodyFieldExtractors:
                                current.bodyFieldExtractors.map(
                                  (entry, entryIndex) =>
                                    entryIndex === index
                                      ? { ...entry, label: value }
                                      : entry,
                                ),
                            }));
                          }}
                        />
                      </div>
                      <div>
                        <FieldLabel>
                          {t("platform.email.extractorTransform")}
                        </FieldLabel>
                        <select
                          className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                          value={row.transform}
                          onChange={(event) => {
                            const value = event.target
                              .value as ExtractorFormRow["transform"];
                            setForm((current) => ({
                              ...current,
                              bodyFieldExtractors:
                                current.bodyFieldExtractors.map(
                                  (entry, entryIndex) =>
                                    entryIndex === index
                                      ? { ...entry, transform: value }
                                      : entry,
                                ),
                            }));
                          }}
                        >
                          <option value="trim">trim</option>
                          <option value="amount">amount</option>
                          <option value="slashDate">slashDate</option>
                          <option value="valueMap">valueMap</option>
                          <option value="literal">literal</option>
                        </select>
                      </div>
                    </div>
                    {row.transform !== "literal" ? (
                      <div className="grid gap-2 sm:grid-cols-4">
                        <div className="sm:col-span-3">
                          <FieldLabel>
                            {t("platform.email.extractorPattern")}
                          </FieldLabel>
                          <Input
                            value={row.pattern}
                            placeholder="/por\\s+\\$([\\d.,]+)/i"
                            onChange={(event) => {
                              const value = event.target.value;
                              setForm((current) => ({
                                ...current,
                                bodyFieldExtractors:
                                  current.bodyFieldExtractors.map(
                                    (entry, entryIndex) =>
                                      entryIndex === index
                                        ? { ...entry, pattern: value }
                                        : entry,
                                  ),
                              }));
                            }}
                          />
                        </div>
                        <div>
                          <FieldLabel>
                            {t("platform.email.extractorCaptureGroup")}
                          </FieldLabel>
                          <Input
                            value={row.captureGroup}
                            placeholder="1"
                            onChange={(event) => {
                              const value = event.target.value;
                              setForm((current) => ({
                                ...current,
                                bodyFieldExtractors:
                                  current.bodyFieldExtractors.map(
                                    (entry, entryIndex) =>
                                      entryIndex === index
                                        ? { ...entry, captureGroup: value }
                                        : entry,
                                  ),
                              }));
                            }}
                          />
                        </div>
                      </div>
                    ) : null}
                    {row.transform === "valueMap" ? (
                      <>
                        <FieldLabel>
                          {t("platform.email.extractorValueMap")}
                        </FieldLabel>
                        <Textarea
                          value={row.valueMapJson}
                          placeholder='{"Compra":"EXPENSE","Abono":"PAYMENT"}'
                          onChange={(event) => {
                            const value = event.target.value;
                            setForm((current) => ({
                              ...current,
                              bodyFieldExtractors:
                                current.bodyFieldExtractors.map(
                                  (entry, entryIndex) =>
                                    entryIndex === index
                                      ? { ...entry, valueMapJson: value }
                                      : entry,
                                ),
                            }));
                          }}
                        />
                      </>
                    ) : null}
                    {row.transform === "literal" ? (
                      <>
                        <FieldLabel>
                          {t("platform.email.extractorLiteral")}
                        </FieldLabel>
                        <Input
                          value={row.literal}
                          placeholder="PAYMENT"
                          onChange={(event) => {
                            const value = event.target.value;
                            setForm((current) => ({
                              ...current,
                              bodyFieldExtractors:
                                current.bodyFieldExtractors.map(
                                  (entry, entryIndex) =>
                                    entryIndex === index
                                      ? { ...entry, literal: value }
                                      : entry,
                                ),
                            }));
                          }}
                        />
                      </>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          bodyFieldExtractors:
                            current.bodyFieldExtractors.filter(
                              (_entry, entryIndex) => entryIndex !== index,
                            ),
                        }))
                      }
                    >
                      {t("platform.email.removeBodyFieldExtractor")}
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={listViewOpen}
        onClose={() => setListViewOpen(false)}
        title={t("platform.email.json.viewListTitle")}
        size="xl"
        scrollable
        footer={
          <Button type="button" onClick={() => setListViewOpen(false)}>
            {t("platform.email.json.close")}
          </Button>
        }
      >
        <pre className="bg-muted overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
          {listViewJsonText}
        </pre>
      </Modal>

      <Modal
        open={listImportOpen}
        onClose={() => setListImportOpen(false)}
        title={t("platform.email.json.importListTitle")}
        size="xl"
        scrollable
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => listFileInputRef.current?.click()}
            >
              {t("platform.email.json.loadFile")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setListImportOpen(false)}
            >
              {t("platform.email.json.close")}
            </Button>
            <Button
              type="button"
              disabled={
                !listImportValidation.ok || listImportMutation.isPending
              }
              onClick={() => {
                if (listImportValidation.ok) {
                  listImportMutation.mutate(listImportValidation.data);
                }
              }}
            >
              {t("platform.email.json.apply")}
            </Button>
          </>
        }
      >
        <Text className="text-muted-foreground mb-2 text-sm">
          {t("platform.email.json.importListHint")}
        </Text>
        <input
          ref={listFileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setListImportText(await file.text());
            event.target.value = "";
          }}
        />
        <Textarea
          className="min-h-64 font-mono text-xs"
          value={listImportText}
          onChange={(event) => setListImportText(event.target.value)}
        />
        <JsonImportErrors
          errors={listImportValidation.ok ? [] : listImportValidation.errors}
          invalidLabel={t("platform.email.json.invalid")}
        />
      </Modal>

      <Modal
        open={itemViewOpen}
        onClose={() => setItemViewOpen(false)}
        title={t("platform.email.json.viewItemTitle")}
        size="xl"
        scrollable
        footer={
          <Button type="button" onClick={() => setItemViewOpen(false)}>
            {t("platform.email.json.close")}
          </Button>
        }
      >
        <pre className="bg-muted overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
          {itemViewJsonText}
        </pre>
      </Modal>

      <Modal
        open={itemImportOpen}
        onClose={() => setItemImportOpen(false)}
        title={t("platform.email.json.importItemTitle")}
        size="xl"
        scrollable
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => itemFileInputRef.current?.click()}
            >
              {t("platform.email.json.loadFile")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setItemImportOpen(false)}
            >
              {t("platform.email.json.close")}
            </Button>
            <Button
              type="button"
              disabled={!itemImportValidation.ok}
              onClick={() => {
                if (!itemImportValidation.ok) return;
                setForm(formFromPortable(itemImportValidation.data));
                setItemImportOpen(false);
                setItemImportText("");
                toast.success(t("platform.email.json.appliedToForm"));
              }}
            >
              {t("platform.email.json.apply")}
            </Button>
          </>
        }
      >
        <Text className="text-muted-foreground mb-2 text-sm">
          {t("platform.email.json.importItemHint")}
        </Text>
        <input
          ref={itemFileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setItemImportText(await file.text());
            event.target.value = "";
          }}
        />
        <Textarea
          className="min-h-64 font-mono text-xs"
          value={itemImportText}
          onChange={(event) => setItemImportText(event.target.value)}
        />
        <JsonImportErrors
          errors={itemImportValidation.ok ? [] : itemImportValidation.errors}
          invalidLabel={t("platform.email.json.invalid")}
        />
      </Modal>
    </section>
  );
}
