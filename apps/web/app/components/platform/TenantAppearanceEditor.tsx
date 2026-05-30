import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { useTranslation } from "react-i18next";

import { Alert, Button, FieldLabel, Form, Input, Text } from "@repo/ui";

import type { ColorPaletteConfig, TenantAppearance } from "@repo/shared-types";
import {
  appearanceToCssVariables,
  inferPaletteFromLegacyColors,
  isPaletteCssVar,
  TENANT_OVERRIDE_GROUPS,
} from "@repo/theme/tenant-overrides";

import { useAuth } from "../../auth/AuthContext";
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

function extractSidebarColors(
  colors: Record<string, string> | undefined,
): Record<string, string> {
  if (!colors) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(colors).filter(([key]) => !isPaletteCssVar(key)),
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
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const draftAppearance = useMemo(
    (): TenantAppearance => ({
      logoUrl: logoPreview ?? undefined,
      palettes: {
        ...(primaryPalette ? { primary: primaryPalette } : {}),
        ...(neutralPalette ? { neutral: neutralPalette } : {}),
      },
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
      primaryPalette,
      radius,
      sidebarColors,
      spacing,
    ],
  );

  const previewVars = useMemo(
    () => appearanceToCssVariables(draftAppearance),
    [draftAppearance],
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
      setLogoPreview(appearance?.logoUrl ?? null);
    },
    [],
  );

  const loadTenant = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nextTenant = await getAdminTenant(tenantId);
      setTenant(nextTenant);
      applyAppearance(nextTenant.appearance);
    } catch (loadError) {
      setError(
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

  async function handleLogoUpload(file: File) {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await readFileAsBase64(file);
      const result = await uploadTenantLogo(tenantId, {
        contentType: file.type || "image/png",
        data,
      });
      setLogoPreview(result.logoUrl);
      setTenant(result.tenant);
      setSuccess(t("platform.appearance.logoSuccess"));
      await selectTenant(tenantId);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : t("platform.appearance.saveFailed"),
      );
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

    return {
      logoUrl: logoPreview ?? undefined,
      palettes,
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
    setError(null);
    setSuccess(null);
    try {
      const appearance = buildAppearanceForSave();
      const updated = await updateAdminTenant(tenantId, { appearance });
      setTenant(updated);
      applyAppearance(updated.appearance);
      setSuccess(t("platform.appearance.saveSuccess"));
      await selectTenant(tenantId);
    } catch (saveError) {
      setError(
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
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateAdminTenant(tenantId, { appearance: null });
      setTenant(updated);
      applyAppearance(undefined);
      setSuccess(t("platform.appearance.resetSuccess"));
      await selectTenant(tenantId);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : t("platform.appearance.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <Text>{t("loading")}</Text>;
  }

  if (!tenant) {
    return <Alert>{t("platform.currentTenant.notFound")}</Alert>;
  }

  return (
    <div className="flex w-full flex-col gap-6 xl:flex-row">
      <Form
        className="grid max-w-3xl flex-1 gap-6"
        onSubmit={(event) => void handleSave(event)}
      >
        {error ? <Alert>{error}</Alert> : null}
        {success ? <Alert>{success}</Alert> : null}

        <section className="grid gap-3">
          <Text className="font-medium">{t("platform.appearance.logo")}</Text>
          {logoPreview ? (
            <img
              src={logoPreview}
              alt={t("platform.appearance.logoPreview")}
              className="h-16 w-auto object-contain"
            />
          ) : null}
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleLogoUpload(file);
            }}
          />
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
          <Text className="font-medium">{t("platform.appearance.layout")}</Text>
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
        className="border-border flex-1 rounded-lg border p-6"
        style={previewVars as CSSProperties}
      >
        <Text className="font-medium">{t("platform.appearance.preview")}</Text>
        <div className="bg-background text-foreground mt-4 space-y-2 rounded-md border p-4">
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
  );
}
