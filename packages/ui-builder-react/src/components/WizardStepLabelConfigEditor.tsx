import type { WizardStepLabelConfig } from "@repo/ui-builder-core";
import {
  Input,
  SegmentedSwitch,
  Switch,
  type SegmentedSwitchOption,
  Select,
} from "@repo/ui";

import type { StyleRulesEditorLabels } from "./StyleRulesEditor.js";
import { ColorValueEditor } from "./ColorValueEditor.js";

const MIN_STEP_LABEL_FONT_SIZE_PX = 8;
const MAX_STEP_LABEL_FONT_SIZE_PX = 48;

function clampStepLabelFontSizePx(value: number): number {
  return Math.min(
    MAX_STEP_LABEL_FONT_SIZE_PX,
    Math.max(MIN_STEP_LABEL_FONT_SIZE_PX, Math.round(value)),
  );
}

type FontWeightOption = "default" | "bold" | "thin" | "normal";

export interface WizardStepLabelConfigEditorLabels {
  readonly showLabel: string;
  readonly labelPosition: string;
  readonly labelTop: string;
  readonly labelBottom: string;
  readonly labelLeft: string;
  readonly labelRight: string;
  readonly labelHidden: string;
  readonly labelAlignLeft?: string;
  readonly labelAlignCenter?: string;
  readonly labelAlignRight?: string;
  readonly labelAlignment?: string;
  readonly labelColor?: string;
  readonly labelFontWeight?: string;
  readonly labelFontDefault?: string;
  readonly labelFontBold?: string;
  readonly labelFontThin?: string;
  readonly labelFontNormal?: string;
  readonly labelItalic?: string;
  readonly labelUnderline?: string;
  readonly labelFontSize?: string;
}

export interface WizardStepLabelConfigEditorProps {
  readonly stepLabel?: WizardStepLabelConfig;
  readonly onChange: (stepLabel: WizardStepLabelConfig | undefined) => void;
  readonly labels: WizardStepLabelConfigEditorLabels;
  readonly colorLabels: StyleRulesEditorLabels;
}

function resolveFontWeightOption(
  stepLabel?: WizardStepLabelConfig,
): FontWeightOption {
  if (stepLabel?.bold === true) {
    return "bold";
  }
  if (stepLabel?.thin === true) {
    return "thin";
  }
  if (stepLabel?.bold === false) {
    return "normal";
  }
  return "default";
}

function fontWeightPatch(
  option: FontWeightOption,
): Partial<WizardStepLabelConfig> {
  switch (option) {
    case "bold":
      return { bold: true, thin: false };
    case "thin":
      return { bold: false, thin: true };
    case "normal":
      return { bold: false, thin: false };
    case "default":
      return { bold: undefined, thin: undefined };
  }
}

export function WizardStepLabelConfigEditor({
  stepLabel,
  onChange,
  labels,
  colorLabels,
}: WizardStepLabelConfigEditorProps) {
  const show = stepLabel?.position !== "hidden" && stepLabel?.show !== false;

  const updateStepLabel = (patch: Partial<WizardStepLabelConfig>) => {
    onChange({
      show: stepLabel?.show ?? true,
      position: stepLabel?.position ?? "top",
      ...stepLabel,
      ...patch,
    });
  };

  const fontWeightOptions: readonly SegmentedSwitchOption<FontWeightOption>[] =
    [
      {
        value: "default",
        label: labels.labelFontDefault ?? "Default",
        ariaLabel: labels.labelFontDefault ?? "Default",
      },
      {
        value: "bold",
        label: labels.labelFontBold ?? "Bold",
        ariaLabel: labels.labelFontBold ?? "Bold",
      },
      {
        value: "thin",
        label: labels.labelFontThin ?? "Thin",
        ariaLabel: labels.labelFontThin ?? "Thin",
      },
      {
        value: "normal",
        label: labels.labelFontNormal ?? "Normal",
        ariaLabel: labels.labelFontNormal ?? "Normal",
      },
    ];

  return (
    <div className="flex flex-col gap-3">
      <Switch
        variant="ios"
        checked={show}
        onChange={(checked) =>
          updateStepLabel({
            show: checked,
            position: checked
              ? stepLabel?.position === "hidden"
                ? "top"
                : (stepLabel?.position ?? "top")
              : "hidden",
          })
        }
        label={labels.showLabel}
      />

      {show ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">
                {labels.labelPosition}
              </span>
              <Select
                searchable
                value={stepLabel?.position ?? "top"}
                onChange={(event) =>
                  updateStepLabel({
                    show: true,
                    position: event.target
                      .value as WizardStepLabelConfig["position"],
                  })
                }
              >
                <option value="top">{labels.labelTop}</option>
                <option value="bottom">{labels.labelBottom}</option>
                <option value="left">{labels.labelLeft}</option>
                <option value="right">{labels.labelRight}</option>
                <option value="hidden">{labels.labelHidden}</option>
              </Select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">
                {labels.labelAlignment ?? "Alignment"}
              </span>
              <Select
                searchable
                value={stepLabel?.align ?? "left"}
                onChange={(event) =>
                  updateStepLabel({
                    show: true,
                    align: event.target.value as WizardStepLabelConfig["align"],
                  })
                }
              >
                <option value="left">{labels.labelAlignLeft ?? "Left"}</option>
                <option value="center">
                  {labels.labelAlignCenter ?? "Center"}
                </option>
                <option value="right">
                  {labels.labelAlignRight ?? "Right"}
                </option>
              </Select>
            </label>
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">
              {labels.labelFontWeight ?? "Font weight"}
            </span>
            <SegmentedSwitch
              value={resolveFontWeightOption(stepLabel)}
              options={fontWeightOptions}
              onChange={(option) =>
                updateStepLabel({ show: true, ...fontWeightPatch(option) })
              }
              ariaLabel={labels.labelFontWeight ?? "Font weight"}
              fullWidth
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Switch
              variant="ios"
              checked={stepLabel?.italic ?? false}
              onChange={(checked) =>
                updateStepLabel({ show: true, italic: checked })
              }
              label={labels.labelItalic ?? "Italic"}
            />
            <Switch
              variant="ios"
              checked={stepLabel?.underline ?? false}
              onChange={(checked) =>
                updateStepLabel({ show: true, underline: checked })
              }
              label={labels.labelUnderline ?? "Underline"}
            />
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">
              {labels.labelFontSize ?? "Text size (px)"}
            </span>
            <Input
              type="number"
              min={MIN_STEP_LABEL_FONT_SIZE_PX}
              max={MAX_STEP_LABEL_FONT_SIZE_PX}
              value={stepLabel?.fontSize ?? ""}
              placeholder="Default"
              onChange={(event) => {
                const raw = event.target.value.trim();
                if (raw.length === 0) {
                  updateStepLabel({ show: true, fontSize: undefined });
                  return;
                }
                const parsed = Number.parseInt(raw, 10);
                updateStepLabel({
                  show: true,
                  fontSize: Number.isNaN(parsed)
                    ? undefined
                    : clampStepLabelFontSizePx(parsed),
                });
              }}
            />
          </label>

          {labels.labelColor ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{labels.labelColor}</span>
              <ColorValueEditor
                value={stepLabel?.color ?? "default"}
                onChange={(color) => updateStepLabel({ show: true, color })}
                labels={colorLabels}
                colorRole="text"
              />
            </label>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
