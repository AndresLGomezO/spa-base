import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { useTranslation } from "react-i18next";

import {
  Alert,
  Button,
  FieldLabel,
  Form,
  Input,
  PhotoUpload,
  Text,
  toast,
} from "@repo/ui";

import {
  APPEARANCE_PRESETS,
  type AppearancePreset,
  type ColorPaletteConfig,
  type TenantAppearance,
} from "@repo/shared-types";
import { useColorScheme } from "@repo/theme/react";
import {
  applyAppearancePreset,
  appearanceToCssVariables,
  inferPaletteFromLegacyColors,
  normalizeAppearancePreset,
  normalizeHexColor,
  TENANT_OVERRIDE_GROUPS,
} from "@repo/theme/tenant-overrides";

import { useAuth } from "../../auth/AuthContext";
import { FormModal } from "../forms/FormModal";
import { SettingsPanelSkeleton } from "../loading/SettingsPanelSkeleton";
import {
  getAdminTenant,
  updateAdminTenant,
  uploadTenantLogo,
  type AdminTenant,
} from "../../lib/admin-client";
import { ColorPaletteEditor } from "./ColorPaletteEditor";

interface TenantAppearanceEditorProps {
  readonly tenantId: string;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unable to read file."));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Invalid file data."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

const SIDEBAR_CSS_VARS = new Set<string>(TENANT_OVERRIDE_GROUPS.sidebar);

const SELECTABLE_THEME_PRESETS = APPEARANCE_PRESETS.filter(
  (id): id is Exclude<AppearancePreset, "default"> => id !== "default",
);

function normalizeCssVarKey(key: string): string {
  return key.startsWith("--") ? key : `--${key}`;
}

function extractSidebarColors(
  colors: Record<string, string> | undefined,
): Record<string, string> {
  if (!colors) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(colors).filter(([key]) =>
      SIDEBAR_CSS_VARS.has(normalizeCssVarKey(key)),
    ),
  );
}

function toSemanticColorInputValue(hex: string): string {
  try {
    return normalizeHexColor(hex);
  } catch {
    return "#000000";
  }
}

interface SemanticColorFieldProps {
  readonly cssVar: string;
  readonly value: string;
  readonly placeholder: string;
  readonly onChange: (value: string) => void;
}

function SemanticColorField({
  cssVar,
  value,
  placeholder,
  onChange,
}: SemanticColorFieldProps) {
  const colorPickerValue = value.trim()
    ? toSemanticColorInputValue(value)
    : "#000000";

  const colorInputId = `${cssVar}-picker`;
  const textInputId = `${cssVar}-hex`;

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel htmlFor={textInputId}>{cssVar}</FieldLabel>
      <div className="flex items-center gap-2">
        <Input
          id={colorInputId}
          type="color"
          aria-label={`${cssVar} picker`}
          className="h-10 w-14 shrink-0 cursor-pointer p-1"
          value={colorPickerValue}
          onChange={(event) => onChange(event.target.value)}
        />
        <Input
          id={textInputId}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => {
            const next = event.target.value.trim();
            if (!next) {
              return;
            }
            try {
              onChange(normalizeHexColor(next));
            } catch {
              // Keep partial input until valid hex.
            }
          }}
        />
      </div>
    </div>
  );
}

function resolveLoadedPalettes(appearance: TenantAppearance | undefined): {
  primary: ColorPaletteConfig | undefined;
  neutral: ColorPaletteConfig | undefined;
} {
  return {
    primary:
      appearance?.palettes?.primary ??
      inferPaletteFromLegacyColors("primary", appearance?.colors),
    neutral:
      appearance?.palettes?.neutral ??
      inferPaletteFromLegacyColors("neutral", appearance?.colors),
  };
}

export function TenantAppearanceEditor({
  tenantId,
}: TenantAppearanceEditorProps) {
  const { t } = useTranslation("common");
  const { colorScheme } = useColorScheme();
  const { selectTenant } = useAuth();
  const [tenant, setTenant] = useState<AdminTenant | null>(null);
  const [primaryPalette, setPrimaryPalette] = useState<
    ColorPaletteConfig | undefined
  >();
  const [neutralPalette, setNeutralPalette] = useState<
    ColorPaletteConfig | undefined
  >();
  const [primaryTouched, setPrimaryTouched] = useState(false);
  const [neutralTouched, setNeutralTouched] = useState(false);
  const [sidebarColors, setSidebarColors] = useState<Record<string, string>>(
    {},
  );
  const [fontFamily, setFontFamily] = useState("");
  const [bodySize, setBodySize] = useState("");
  const [headingSize, setHeadingSize] = useState("");
  const [radius, setRadius] = useState("");
  const [spacing, setSpacing] = useState("");
  const [preset, setPreset] = useState<AppearancePreset>("default");
  const [semantics, setSemantics] = useState<Record<string, string>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const draftAppearance = useMemo(
    (): TenantAppearance => ({
      logoUrl: logoPreview ?? undefined,
      preset: preset === "default" ? undefined : preset,
      palettes: {
        ...(primaryPalette ? { primary: primaryPalette } : {}),
        ...(neutralPalette ? { neutral: neutralPalette } : {}),
      },
      semantics: (() => {
        const next = Object.fromEntries(
          Object.entries(semantics).filter(([, value]) => value.trim()),
        );
        return Object.keys(next).length > 0 ? next : undefined;
      })(),
      colors: sidebarColors,
      fontFamily: fontFamily.trim() || undefined,
      fontSizes: {
        body: bodySize.trim() || undefined,
        heading: headingSize.trim() || undefined,
      },
      radius: radius.trim() || undefined,
      spacing: spacing.trim() || undefined,
    }),
    [
      bodySize,
      fontFamily,
      headingSize,
      logoPreview,
      neutralPalette,
      preset,
      primaryPalette,
      radius,
      semantics,
      sidebarColors,
      spacing,
    ],
  );

  const savedPreviewVars = useMemo(
    () => appearanceToCssVariables(tenant?.appearance ?? {}, { colorScheme }),
    [colorScheme, tenant?.appearance],
  );

  const draftPreviewVars = useMemo(
    () => appearanceToCssVariables(draftAppearance, { colorScheme }),
    [colorScheme, draftAppearance],
  );

  const applyAppearance = useCallback(
    (appearance: TenantAppearance | undefined) => {
      const palettes = resolveLoadedPalettes(appearance);
      setPrimaryPalette(palettes.primary);
      setNeutralPalette(palettes.neutral);
      setPrimaryTouched(Boolean(appearance?.palettes?.primary));
      setNeutralTouched(Boolean(appearance?.palettes?.neutral));
      setSidebarColors(extractSidebarColors(appearance?.colors));
      setFontFamily(appearance?.fontFamily ?? "");
      setBodySize(appearance?.fontSizes?.body ?? "");
      setHeadingSize(appearance?.fontSizes?.heading ?? "");
      setRadius(appearance?.radius ?? "");
      setSpacing(appearance?.spacing ?? "");
      setPreset(normalizeAppearancePreset(appearance?.preset));
      setSemantics(appearance?.semantics ?? {});
      setLogoPreview(appearance?.logoUrl ?? null);
    },
    [],
  );

  function handlePresetChange(nextPreset: AppearancePreset) {
    setPreset(nextPreset);
    if (nextPreset === "default") {
      return;
    }

    const merged = applyAppearancePreset({ preset: nextPreset });
    const palettes = resolveLoadedPalettes(merged);
    if (palettes.primary) {
      setPrimaryPalette(palettes.primary);
      setPrimaryTouched(true);
    }
    if (palettes.neutral) {
      setNeutralPalette(palettes.neutral);
      setNeutralTouched(true);
    }
    if (merged.semantics) {
      setSemantics(merged.semantics);
    }
  }

  const loadTenant = useCallback(async () => {
    setIsLoading(true);
    try {
      const nextTenant = await getAdminTenant(tenantId);
      setTenant(nextTenant);
      applyAppearance(nextTenant.appearance);
    } catch (loadError) {
      toast.error(
        loadError instanceof Error
          ? loadError.message
          : t("platform.appearance.loadFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [applyAppearance, t, tenantId]);

  useEffect(() => {
    void loadTenant();
  }, [loadTenant]);

  async function handleLogoUpload(params: {
    readonly file: File;
    readonly uploadId: string;
  }) {
    setIsSaving(true);
    try {
      const data = await readFileAsBase64(params.file);
      const result = await uploadTenantLogo(tenantId, {
        contentType: params.file.type || "image/jpeg",
        data,
        objectId: params.uploadId,
      });
      setLogoPreview(result.logoUrl);
      setTenant(result.tenant);
      toast.success(t("platform.appearance.logoSuccess"));
      await selectTenant(tenantId);
    } catch (uploadError) {
      toast.error(
        uploadError instanceof Error
          ? uploadError.message
          : t("platform.appearance.saveFailed"),
      );
      throw uploadError;
    } finally {
      setIsSaving(false);
    }
  }

  function buildAppearanceForSave(): TenantAppearance {
    const palettes =
      primaryTouched || neutralTouched
        ? {
            ...(primaryTouched && primaryPalette
              ? { primary: primaryPalette }
              : {}),
            ...(neutralTouched && neutralPalette
              ? { neutral: neutralPalette }
              : {}),
          }
        : undefined;

    const semanticsToSave = Object.fromEntries(
      Object.entries(semantics).filter(([, value]) => value.trim()),
    );

    return {
      logoUrl: logoPreview ?? undefined,
      preset: preset === "default" ? undefined : preset,
      palettes,
      semantics:
        Object.keys(semanticsToSave).length > 0 ? semanticsToSave : undefined,
      colors: Object.fromEntries(
        Object.entries(sidebarColors).filter(([, value]) => value.trim()),
      ),
      fontFamily: fontFamily.trim() || undefined,
      fontSizes: {
        body: bodySize.trim() || undefined,
        heading: headingSize.trim() || undefined,
      },
      radius: radius.trim() || undefined,
      spacing: spacing.trim() || undefined,
    };
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const appearance = buildAppearanceForSave();
      const updated = await updateAdminTenant(tenantId, { appearance });
      setTenant(updated);
      applyAppearance(updated.appearance);
      toast.success(t("platform.appearance.saveSuccess"));
      await selectTenant(tenantId);
      setFormOpen(false);
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : t("platform.appearance.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReset() {
    setIsSaving(true);
    try {
      const updated = await updateAdminTenant(tenantId, { appearance: null });
      setTenant(updated);
      applyAppearance(undefined);
      toast.success(t("platform.appearance.resetSuccess"));
      await selectTenant(tenantId);
    } catch (resetError) {
      toast.error(
        resetError instanceof Error
          ? resetError.message
          : t("platform.appearance.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <SettingsPanelSkeleton variant="appearance" />;
  }

  if (!tenant) {
    return <Alert>{t("platform.currentTenant.notFound")}</Alert>;
  }

  const savedPreset = normalizeAppearancePreset(tenant.appearance?.preset);
  const presetLabel =
    savedPreset === "default"
      ? t("platform.appearance.presetDefault")
      : t(`platform.appearance.presets.${savedPreset}` as never);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => setFormOpen(true)}>
          {t("platform.appearance.customize")}
        </Button>
      </div>

      <div className="grid gap-4 text-sm md:grid-cols-2">
        <dl className="grid gap-2">
          <div>
            <dt className="text-muted-foreground font-medium">
              {t("platform.appearance.logo")}
            </dt>
            <dd>
              {tenant.appearance?.logoUrl ? (
                <img
                  src={tenant.appearance.logoUrl}
                  alt={t("platform.appearance.logoPreview")}
                  className="mt-1 h-12 w-auto max-w-full object-contain"
                />
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground font-medium">
              {t("platform.appearance.preset")}
            </dt>
            <dd>{presetLabel}</dd>
          </div>
        </dl>

        <div
          className="border-border rounded-lg border p-6"
          style={savedPreviewVars as CSSProperties}
        >
          <Text className="font-medium">
            {t("platform.appearance.preview")}
          </Text>
          <div className="bg-card text-card-foreground mt-4 space-y-2 rounded-md border p-4">
            <Text className="text-heading font-semibold">{tenant.name}</Text>
            <Text className="text-body">
              {t("platform.appearance.previewBody")}
            </Text>
            <Button type="button">
              {t("platform.appearance.previewButton")}
            </Button>
          </div>
        </div>
      </div>

      <FormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={t("platform.appearance.customize")}
        size="xl"
      >
        <div className="flex flex-col gap-6 xl:flex-row">
          <Form
            className="grid min-w-0 flex-1 gap-6"
            onSubmit={(event) => void handleSave(event)}
          >
            <section className="grid gap-3">
              <Text className="font-medium">
                {t("platform.appearance.logo")}
              </Text>
              <PhotoUpload
                value={logoPreview}
                alt={t("platform.appearance.logoPreview")}
                cropShape="rect"
                uploading={isSaving}
                disabled={isSaving}
                labels={{
                  select: t("platform.appearance.photoSelect"),
                  change: t("platform.appearance.photoChange"),
                  cropTitle: t("platform.appearance.photoCropTitle"),
                  cropDescription: t(
                    "platform.appearance.photoCropDescription",
                  ),
                  upload: t("platform.appearance.photoUpload"),
                  cancel: t("platform.appearance.photoCancel"),
                  reset: t("platform.appearance.photoReset"),
                  expand: t("platform.appearance.photoExpand"),
                }}
                onUpload={handleLogoUpload}
                onError={(message) => toast.error(message)}
              />
            </section>

            <section className="border-border grid gap-3 rounded-lg border p-4">
              <Text className="font-medium">
                {t("platform.appearance.preset")}
              </Text>
              <Text className="text-muted-foreground text-sm">
                {t("platform.appearance.presetHint")}
              </Text>
              <div className="flex max-w-md flex-col gap-1">
                <FieldLabel htmlFor="appearance-preset">
                  {t("platform.appearance.preset")}
                </FieldLabel>
                <select
                  id="appearance-preset"
                  className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm shadow-sm"
                  value={preset}
                  onChange={(event) =>
                    handlePresetChange(event.target.value as AppearancePreset)
                  }
                >
                  <option value="default">
                    {t("platform.appearance.presetDefault")}
                  </option>
                  {SELECTABLE_THEME_PRESETS.map((presetId) => (
                    <option key={presetId} value={presetId}>
                      {t(`platform.appearance.presets.${presetId}` as never)}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <ColorPaletteEditor
              kind="primary"
              value={primaryPalette}
              onChange={(value) => {
                setPrimaryPalette(value);
                setPrimaryTouched(true);
              }}
            />

            <ColorPaletteEditor
              kind="neutral"
              value={neutralPalette}
              onChange={(value) => {
                setNeutralPalette(value);
                setNeutralTouched(true);
              }}
            />

            <section className="border-border grid gap-3 rounded-lg border p-4">
              <Text className="font-medium">
                {t("platform.appearance.semantics")}
              </Text>
              <Text className="text-muted-foreground text-sm">
                {t("platform.appearance.semanticsHint")}
              </Text>
              {TENANT_OVERRIDE_GROUPS.semantics.map((cssVar) => (
                <SemanticColorField
                  key={cssVar}
                  cssVar={cssVar}
                  value={semantics[cssVar] ?? ""}
                  placeholder={t("platform.appearance.placeholder")}
                  onChange={(nextValue) =>
                    setSemantics((current) => ({
                      ...current,
                      [cssVar]: nextValue,
                    }))
                  }
                />
              ))}
            </section>

            {(["sidebar"] as const).map((groupKey) => {
              const vars = TENANT_OVERRIDE_GROUPS[groupKey];
              return (
                <section key={groupKey} className="grid gap-3">
                  <Text className="font-medium">
                    {t(`platform.appearance.groups.${groupKey}` as never)}
                  </Text>
                  {vars.map((cssVar) => (
                    <div key={cssVar} className="flex flex-col gap-1">
                      <FieldLabel htmlFor={cssVar}>{cssVar}</FieldLabel>
                      <Input
                        id={cssVar}
                        value={sidebarColors[cssVar] ?? ""}
                        placeholder={t("platform.appearance.placeholder")}
                        onChange={(event) =>
                          setSidebarColors((current) => ({
                            ...current,
                            [cssVar]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </section>
              );
            })}

            <section className="grid gap-3">
              <Text className="font-medium">
                {t("platform.appearance.typography")}
              </Text>
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="font-family">
                  {t("platform.appearance.fontFamily")}
                </FieldLabel>
                <Input
                  id="font-family"
                  value={fontFamily}
                  onChange={(event) => setFontFamily(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="body-size">
                  {t("platform.appearance.bodySize")}
                </FieldLabel>
                <Input
                  id="body-size"
                  value={bodySize}
                  onChange={(event) => setBodySize(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="heading-size">
                  {t("platform.appearance.headingSize")}
                </FieldLabel>
                <Input
                  id="heading-size"
                  value={headingSize}
                  onChange={(event) => setHeadingSize(event.target.value)}
                />
              </div>
            </section>

            <section className="grid gap-3">
              <Text className="font-medium">
                {t("platform.appearance.layout")}
              </Text>
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="radius">
                  {t("platform.appearance.radius")}
                </FieldLabel>
                <Input
                  id="radius"
                  value={radius}
                  onChange={(event) => setRadius(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="spacing">
                  {t("platform.appearance.spacing")}
                </FieldLabel>
                <Input
                  id="spacing"
                  value={spacing}
                  onChange={(event) => setSpacing(event.target.value)}
                />
              </div>
            </section>

            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? t("loading") : t("platform.appearance.save")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isSaving}
                onClick={() => void handleReset()}
              >
                {t("platform.appearance.reset")}
              </Button>
            </div>
          </Form>

          <div
            className="border-border min-w-0 flex-1 rounded-lg border p-6"
            style={draftPreviewVars as CSSProperties}
          >
            <Text className="font-medium">
              {t("platform.appearance.preview")}
            </Text>
            <div className="bg-card text-card-foreground mt-4 space-y-2 rounded-md border p-4">
              <Text className="text-heading font-semibold">{tenant.name}</Text>
              <Text className="text-body">
                {t("platform.appearance.previewBody")}
              </Text>
              <Button type="button">
                {t("platform.appearance.previewButton")}
              </Button>
            </div>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
