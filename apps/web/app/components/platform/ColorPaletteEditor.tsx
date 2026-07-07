import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { ColorPaletteConfig, ColorScaleStep } from "@repo/shared-types";
import { Button, FieldLabel, Input, Text } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import {
  COLOR_SCALE_STEPS,
  generateColorScale,
  getDefaultReferenceScale,
  normalizeHexColor,
  type PaletteKind,
} from "@repo/theme/tenant-overrides";

interface ColorPaletteEditorProps {
  readonly kind: PaletteKind;
  readonly value: ColorPaletteConfig | undefined;
  readonly onChange: (value: ColorPaletteConfig) => void;
}

function toColorInputValue(hex: string): string {
  try {
    return normalizeHexColor(hex);
  } catch {
    return "#000000";
  }
}

function hasShadeOverrides(
  overrides: Partial<Record<ColorScaleStep, string>> | undefined,
): overrides is Partial<Record<ColorScaleStep, string>> {
  return overrides !== undefined && Object.keys(overrides).length > 0;
}

export function ColorPaletteEditor({
  kind,
  value,
  onChange,
}: ColorPaletteEditorProps) {
  const { t } = useTranslation("common");
  const referenceScale = getDefaultReferenceScale(kind);

  const [anchorStep, setAnchorStep] = useState<ColorScaleStep>(
    value?.anchorStep ?? "500",
  );
  const [anchorColor, setAnchorColor] = useState(
    value?.anchorColor ?? referenceScale["500"],
  );
  const [shadeOverrides, setShadeOverrides] = useState<
    Partial<Record<ColorScaleStep, string>>
  >(value?.shadeOverrides ?? {});

  useEffect(() => {
    setAnchorStep(value?.anchorStep ?? "500");
    setAnchorColor(value?.anchorColor ?? referenceScale["500"]);
    setShadeOverrides(value?.shadeOverrides ?? {});
  }, [referenceScale, value]);

  const generatedScale = useMemo(
    () =>
      generateColorScale({
        anchorColor,
        anchorStep,
        referenceScale,
        shadeOverrides,
      }),
    [anchorColor, anchorStep, referenceScale, shadeOverrides],
  );

  function emitChange(
    nextAnchorStep: ColorScaleStep,
    nextAnchorColor: string,
    nextOverrides: Partial<Record<ColorScaleStep, string>>,
  ) {
    onChange({
      anchorStep: nextAnchorStep,
      anchorColor: normalizeHexColor(nextAnchorColor),
      shadeOverrides: hasShadeOverrides(nextOverrides)
        ? nextOverrides
        : undefined,
    });
  }

  function handleAnchorStepChange(step: ColorScaleStep) {
    setAnchorStep(step);
    emitChange(step, anchorColor, shadeOverrides);
  }

  function handleAnchorColorChange(nextColor: string) {
    setAnchorColor(nextColor);
    try {
      emitChange(anchorStep, nextColor, shadeOverrides);
    } catch {
      // Ignore invalid partial hex while typing.
    }
  }

  function handleShadeChange(step: ColorScaleStep, nextColor: string) {
    try {
      const normalized = normalizeHexColor(nextColor);
      const nextOverrides = { ...shadeOverrides, [step]: normalized };
      setShadeOverrides(nextOverrides);
      emitChange(anchorStep, anchorColor, nextOverrides);
    } catch {
      // Ignore invalid partial hex while typing.
    }
  }

  function handleResetShade(step: ColorScaleStep) {
    const nextOverrides = { ...shadeOverrides };
    delete nextOverrides[step];
    setShadeOverrides(nextOverrides);
    emitChange(anchorStep, anchorColor, nextOverrides);
  }

  function handleRegenerate() {
    emitChange(anchorStep, anchorColor, shadeOverrides);
  }

  return (
    <section className="grid gap-4">
      <Text className="font-medium">
        {t(`platform.appearance.groups.${kind}` as never)}
      </Text>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto] sm:items-end">
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={`${kind}-anchor-step`}>
            {t("platform.appearance.palette.anchorStep")}
          </FieldLabel>
          <Select
            id={`${kind}-anchor-step`}
            className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm shadow-sm"
            value={anchorStep}
            onChange={(event) =>
              handleAnchorStepChange(event.target.value as ColorScaleStep)
            }
          >
            {COLOR_SCALE_STEPS.map((step) => (
              <option key={step} value={step}>
                {step}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={`${kind}-anchor-color`}>
            {t("platform.appearance.palette.anchorColor")}
          </FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id={`${kind}-anchor-color`}
              type="color"
              className="h-10 w-14 shrink-0 cursor-pointer p-1"
              value={toColorInputValue(anchorColor)}
              onChange={(event) => handleAnchorColorChange(event.target.value)}
            />
            <Input
              aria-label={t("platform.appearance.palette.anchorColorHex")}
              value={anchorColor}
              onChange={(event) => handleAnchorColorChange(event.target.value)}
              onBlur={(event) => {
                try {
                  handleAnchorColorChange(
                    normalizeHexColor(event.target.value),
                  );
                } catch {
                  handleAnchorColorChange(referenceScale[anchorStep]);
                }
              }}
            />
          </div>
        </div>

        <Button type="button" variant="ghost" onClick={handleRegenerate}>
          {t("platform.appearance.palette.regenerate")}
        </Button>
      </div>

      <div className="grid gap-2">
        {COLOR_SCALE_STEPS.map((step) => {
          const isAnchor = step === anchorStep;
          const isManual = shadeOverrides[step] !== undefined;
          const shadeColor = generatedScale[step];

          return (
            <div
              key={step}
              className="grid gap-2 sm:grid-cols-[4rem_minmax(0,1fr)_auto_auto] sm:items-center"
            >
              <div className="flex items-center gap-2">
                <span
                  className="border-border h-8 w-8 rounded border"
                  style={{ backgroundColor: shadeColor }}
                />
                <Text className="text-sm font-medium">{step}</Text>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  className="h-10 w-14 shrink-0 cursor-pointer p-1"
                  value={toColorInputValue(shadeColor)}
                  onChange={(event) =>
                    handleShadeChange(step, event.target.value)
                  }
                />
                <Input
                  value={shadeColor}
                  onChange={(event) =>
                    handleShadeChange(step, event.target.value)
                  }
                  onBlur={(event) => {
                    try {
                      handleShadeChange(
                        step,
                        normalizeHexColor(event.target.value),
                      );
                    } catch {
                      handleResetShade(step);
                    }
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {isAnchor ? (
                  <span className="bg-primary-100 text-primary-900 rounded px-2 py-1">
                    {t("platform.appearance.palette.anchorBadge")}
                  </span>
                ) : null}
                {isManual ? (
                  <span className="bg-neutral-100 text-neutral-900 rounded px-2 py-1">
                    {t("platform.appearance.palette.manualBadge")}
                  </span>
                ) : null}
              </div>

              {isManual ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleResetShade(step)}
                >
                  {t("platform.appearance.palette.resetShade")}
                </Button>
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
