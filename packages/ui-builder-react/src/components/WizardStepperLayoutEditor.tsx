import type { WizardProgressComponentConfig } from "@repo/ui-builder-core";
import { Input } from "@repo/ui";

const MIN_STEP_SPACING_PX = 8;
const MAX_STEP_SPACING_PX = 96;
const DEFAULT_STEP_SPACING_PX = 16;

const MIN_CIRCLE_SIZE_PX = 20;
const MAX_CIRCLE_SIZE_PX = 56;
const DEFAULT_CIRCLE_SIZE_PX = 32;

const MIN_LABEL_MAX_WIDTH_PX = 48;
const MAX_LABEL_MAX_WIDTH_PX = 320;

function clampStepSpacingPx(value: number): number {
  return Math.min(
    MAX_STEP_SPACING_PX,
    Math.max(MIN_STEP_SPACING_PX, Math.round(value)),
  );
}

function clampCircleSizePx(value: number): number {
  return Math.min(
    MAX_CIRCLE_SIZE_PX,
    Math.max(MIN_CIRCLE_SIZE_PX, Math.round(value)),
  );
}

function clampLabelMaxWidthPx(value: number): number {
  return Math.min(
    MAX_LABEL_MAX_WIDTH_PX,
    Math.max(MIN_LABEL_MAX_WIDTH_PX, Math.round(value)),
  );
}

export interface WizardStepperLayoutEditorLabels {
  readonly stepSpacing: string;
  readonly circleSize: string;
  readonly labelMaxWidth: string;
}

export interface WizardStepperLayoutEditorProps {
  readonly config: WizardProgressComponentConfig;
  readonly onChange: (config: WizardProgressComponentConfig) => void;
  readonly labels: WizardStepperLayoutEditorLabels;
}

function parseOptionalPx(
  raw: string,
  clamp: (value: number) => number,
): number | undefined {
  if (raw.trim().length === 0) {
    return undefined;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return clamp(parsed);
}

export function WizardStepperLayoutEditor({
  config,
  onChange,
  labels,
}: WizardStepperLayoutEditorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.stepSpacing}</span>
        <Input
          type="number"
          min={MIN_STEP_SPACING_PX}
          max={MAX_STEP_SPACING_PX}
          value={config.stepSpacing ?? ""}
          placeholder={String(DEFAULT_STEP_SPACING_PX)}
          onChange={(event) =>
            onChange({
              ...config,
              stepSpacing: parseOptionalPx(
                event.target.value,
                clampStepSpacingPx,
              ),
            })
          }
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">{labels.circleSize}</span>
        <Input
          type="number"
          min={MIN_CIRCLE_SIZE_PX}
          max={MAX_CIRCLE_SIZE_PX}
          value={config.circleSize ?? ""}
          placeholder={String(DEFAULT_CIRCLE_SIZE_PX)}
          onChange={(event) =>
            onChange({
              ...config,
              circleSize: parseOptionalPx(
                event.target.value,
                clampCircleSizePx,
              ),
            })
          }
        />
      </label>

      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        <span className="text-muted-foreground">{labels.labelMaxWidth}</span>
        <Input
          type="number"
          min={MIN_LABEL_MAX_WIDTH_PX}
          max={MAX_LABEL_MAX_WIDTH_PX}
          value={config.labelMaxWidth ?? ""}
          placeholder="Default"
          onChange={(event) =>
            onChange({
              ...config,
              labelMaxWidth: parseOptionalPx(
                event.target.value,
                clampLabelMaxWidthPx,
              ),
            })
          }
        />
      </label>
    </div>
  );
}
