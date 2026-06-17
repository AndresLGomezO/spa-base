import {
  isCssBackgroundFillValue,
  isCssGradientBackgroundValue,
  isThemeTokenValue,
  matchConditionalStyles,
  resolveBackgroundComponentColor,
  resolvedBackgroundInlineStyle,
  resolveTextComponentColor,
  splitStyleRuleClasses,
  type TextColorToken,
  type WizardProgressComponentConfig,
  type WizardStepLabelConfig,
  type WizardStepStatusKind,
} from "@repo/ui-builder-core";
import { cn } from "@repo/theme/utils";
import { Check, X } from "lucide-react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import { resolveLucideIcon } from "../../lib/resolve-lucide-icon";
import type { WizardRenderState } from "@repo/ui-builder-renderer";

interface WizardProgressProps {
  readonly config: WizardProgressComponentConfig;
  readonly wizard: WizardRenderState;
}

function statusForStep(
  wizard: WizardRenderState,
  stepId: string,
): WizardStepStatusKind {
  return wizard.stepStatuses[stepId] ?? "pending";
}

function defaultStatusBackgroundClass(
  status: WizardStepStatusKind,
): string | undefined {
  switch (status) {
    case "active":
      return "bg-muted/50";
    case "completed":
      return "bg-badge-info/10";
    case "invalid":
      return "bg-badge-warning/20";
    default:
      return undefined;
  }
}

function resolveWizardProgressVariant(
  config: WizardProgressComponentConfig,
): "steps" | "bar" | "stepper" {
  return config.variant ?? "steps";
}

function resolveStepperLabelPosition(
  stepLabel?: WizardStepLabelConfig,
): "top" | "bottom" | "left" | "right" {
  const position = stepLabel?.position ?? "bottom";
  if (position === "hidden") {
    return "bottom";
  }
  return position;
}

function stepperLabelFontClassName(
  stepLabel: WizardStepLabelConfig | undefined,
  status: WizardStepStatusKind,
): string {
  if (stepLabel?.bold === true) {
    return "font-bold";
  }
  if (stepLabel?.thin === true) {
    return "font-light";
  }
  if (stepLabel?.bold === false) {
    return "font-medium";
  }
  if (status === "active") {
    return "font-bold";
  }
  if (status === "completed") {
    return "font-medium";
  }
  return "font-normal";
}

function defaultStepperCircleClassName(status: WizardStepStatusKind): string {
  switch (status) {
    case "active":
      return "bg-primary text-primary-foreground";
    case "completed":
      return "bg-success text-white";
    case "invalid":
      return "bg-destructive/15 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function defaultStepperLabelClassName(status: WizardStepStatusKind): string {
  switch (status) {
    case "active":
      return "text-foreground";
    case "completed":
      return "text-foreground";
    case "invalid":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

function resolveStepperCirclePresentation(
  status: WizardStepStatusKind,
  conditionalStyles: WizardProgressComponentConfig["conditionalStyles"],
  circleSizePx: number,
): {
  readonly className: string;
  readonly style?: {
    backgroundColor?: string;
    background?: string;
    color?: string;
    width?: number;
    height?: number;
    fontSize?: number;
  };
} {
  const matched = matchConditionalStyles(status, conditionalStyles);
  const fallback = defaultStepperCircleClassName(status);

  return {
    className: cn(
      "flex shrink-0 items-center justify-center rounded-full font-semibold",
      fallback,
      matched.className,
    ),
    style: {
      width: circleSizePx,
      height: circleSizePx,
      fontSize: Math.max(10, Math.round(circleSizePx * 0.375)),
      ...matched.style,
    },
  };
}

function resolveStepperLabelPresentation(
  status: WizardStepStatusKind,
  stepLabel: WizardStepLabelConfig | undefined,
  conditionalStyles: WizardProgressComponentConfig["conditionalStyles"],
): {
  readonly className: string;
  readonly style?: {
    color?: string;
    fontSize?: string;
    backgroundColor?: string;
    background?: string;
  };
} {
  const matched = matchConditionalStyles(status, conditionalStyles);
  const configuredColor = resolveStepLabelColorPresentation(stepLabel?.color);
  const fontSizePresentation = resolveStepLabelFontSizePresentation(
    stepLabel?.fontSize,
  );

  return {
    className: cn(
      "max-w-full",
      defaultStepperLabelTextClassName(stepLabel?.fontSize),
      defaultStepperLabelClassName(status),
      stepperLabelFontClassName(stepLabel, status),
      labelAlignClassName(stepLabel?.align ?? "center"),
      stepLabel?.italic && "italic",
      stepLabel?.underline && "underline",
      configuredColor.className,
      matched.className,
    ),
    style: {
      ...configuredColor.style,
      ...fontSizePresentation.style,
      ...(matched.style?.color ? { color: matched.style.color } : {}),
      ...(matched.style?.background
        ? { background: matched.style.background }
        : {}),
      ...(matched.style?.backgroundColor
        ? { backgroundColor: matched.style.backgroundColor }
        : {}),
    },
  };
}

function resolveStepperConnectorPresentation(
  leftStepStatus: WizardStepStatusKind,
  conditionalStyles: WizardProgressComponentConfig["conditionalStyles"],
): {
  readonly className?: string;
  readonly style?: { backgroundColor?: string; background?: string };
} {
  if (leftStepStatus !== "completed") {
    return { className: "bg-muted" };
  }

  const matched = matchConditionalStyles("completed", conditionalStyles);
  const matchedBackground = matched.style?.background
    ? { background: matched.style.background }
    : matched.style?.backgroundColor
      ? { backgroundColor: matched.style.backgroundColor }
      : undefined;
  if (matchedBackground) {
    return { style: matchedBackground };
  }

  const completedRule = conditionalStyles?.find(
    (rule) => rule.matchValue === "completed",
  );
  if (completedRule?.background) {
    const background = resolveBackgroundComponentColor(
      completedRule.background,
    );
    const inlineStyle = resolvedBackgroundInlineStyle(background);
    if (inlineStyle) {
      return { style: inlineStyle };
    }
    if (background.className) {
      return { className: background.className };
    }
  }

  if (matched.className) {
    const backgroundClasses = matched.className
      .split(/\s+/)
      .filter((part) => part.startsWith("bg-"));
    if (backgroundClasses.length > 0) {
      return { className: backgroundClasses.join(" ") };
    }
  }

  return { className: "bg-success" };
}

function resolveBarTrackPresentation(color?: string): {
  readonly className?: string;
  readonly style?: { backgroundColor?: string; background?: string };
} {
  const resolved = resolveBackgroundComponentColor(color ?? "muted");
  const inlineStyle = resolvedBackgroundInlineStyle(resolved);
  if (inlineStyle) {
    return { style: inlineStyle };
  }
  if (resolved.className) {
    return { className: resolved.className };
  }
  return { className: barTrackClassName(color as TextColorToken | undefined) };
}

function resolveBarFillPresentation(color?: string): {
  readonly className?: string;
  readonly style?: { backgroundColor?: string; background?: string };
} {
  if (!color) {
    return { className: barFillClassName() };
  }

  if (isCssBackgroundFillValue(color) && !isThemeTokenValue(color)) {
    if (isCssGradientBackgroundValue(color)) {
      return { style: { background: color.trim() } };
    }
    return { style: { backgroundColor: color.trim() } };
  }

  const legacyTokens: readonly TextColorToken[] = [
    "default",
    "muted",
    "primary",
    "success",
    "warning",
    "danger",
    "info",
  ];
  if (legacyTokens.includes(color as TextColorToken)) {
    return { className: barFillClassName(color as TextColorToken) };
  }

  if (isThemeTokenValue(color)) {
    switch (color) {
      case "background":
        return { className: "bg-background" };
      case "foreground":
        return { className: "bg-foreground" };
      case "transparent":
        return { className: "bg-transparent" };
      default:
        return { className: barFillClassName("primary") };
    }
  }

  return { className: barFillClassName() };
}

function resolveStepLabelColorPresentation(color?: string): {
  readonly className?: string;
  readonly style?: { color?: string };
} {
  const resolved = resolveTextComponentColor(color ?? "default");
  if (resolved.color) {
    return { style: { color: resolved.color } };
  }
  if (resolved.className) {
    return { className: resolved.className };
  }
  return {
    className: stepLabelColorClassName(color as TextColorToken | undefined),
  };
}

function barTrackClassName(color?: TextColorToken): string {
  switch (color) {
    case "primary":
      return "bg-primary/10";
    case "success":
      return "bg-success/10";
    case "warning":
      return "bg-warning/10";
    case "danger":
      return "bg-destructive/10";
    case "info":
      return "bg-info/10";
    case "muted":
    case "default":
    default:
      return "bg-muted";
  }
}

function barFillClassName(color?: TextColorToken): string {
  switch (color) {
    case "success":
      return "bg-success";
    case "warning":
      return "bg-warning";
    case "danger":
      return "bg-destructive";
    case "info":
      return "bg-info";
    case "muted":
      return "bg-muted-foreground";
    case "default":
    case "primary":
    default:
      return "bg-primary";
  }
}

function stepLabelColorClassName(color?: TextColorToken): string {
  switch (color) {
    case "muted":
      return "text-muted-foreground";
    case "primary":
      return "text-primary";
    case "success":
      return "text-success";
    case "warning":
      return "text-warning";
    case "danger":
      return "text-destructive";
    case "info":
      return "text-info";
    default:
      return "text-foreground";
  }
}

const MIN_STEP_LABEL_FONT_SIZE_PX = 8;
const MAX_STEP_LABEL_FONT_SIZE_PX = 48;

function resolveStepLabelFontSizePresentation(fontSize?: number): {
  readonly className?: string;
  readonly style?: { fontSize?: string };
} {
  if (fontSize === undefined) {
    return {};
  }

  const clamped = Math.min(
    MAX_STEP_LABEL_FONT_SIZE_PX,
    Math.max(MIN_STEP_LABEL_FONT_SIZE_PX, Math.round(fontSize)),
  );

  return {
    style: { fontSize: `${clamped}px` },
  };
}

function defaultStepLabelTextClassName(fontSize?: number): string {
  if (fontSize !== undefined) {
    return "";
  }
  return "text-sm";
}

function defaultStepperLabelTextClassName(fontSize?: number): string {
  if (fontSize !== undefined) {
    return "";
  }
  return "text-xs sm:text-sm";
}

function labelAlignClassName(
  align?: "left" | "center" | "right",
): string | undefined {
  if (align === "center") {
    return "text-center";
  }
  if (align === "right") {
    return "text-right";
  }
  return undefined;
}

function labelFontClassName(stepLabel: WizardStepLabelConfig): string {
  if (stepLabel.bold === true) {
    return "font-bold";
  }
  if (stepLabel.thin === true) {
    return "font-light";
  }
  if (stepLabel.bold === false) {
    return "font-medium";
  }
  return "font-semibold";
}

function shouldShowStepLabel(stepLabel?: WizardStepLabelConfig): boolean {
  if (stepLabel?.position === "hidden") {
    return false;
  }
  if (stepLabel?.show === false) {
    return false;
  }
  return true;
}

function resolveStepLabelPosition(
  stepLabel?: WizardStepLabelConfig,
): "top" | "bottom" | "left" | "right" {
  const position = stepLabel?.position ?? "top";
  if (position === "hidden") {
    return "top";
  }
  return position;
}

function WizardProgressSteps({
  config,
  wizard,
}: WizardProgressProps): React.ReactElement {
  const { containerClassName } = splitStyleRuleClasses(config.styles);

  return (
    <nav className={containerClassName} aria-label="Form steps">
      <ol className="flex flex-col gap-1">
        {wizard.steps.map((step, index) => {
          const status = statusForStep(wizard, step.id);
          const matched = matchConditionalStyles(
            status,
            config.conditionalStyles,
          );
          const rowClassName = [
            "flex items-start gap-3 rounded-md px-3 py-2 text-sm",
            defaultStatusBackgroundClass(status),
            matched.className,
          ]
            .filter(Boolean)
            .join(" ");

          const Icon = step.icon ? resolveLucideIcon(step.icon) : null;

          return (
            <li key={step.id} className={rowClassName} style={matched.style}>
              <span
                className="text-muted-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center"
                aria-hidden
              >
                {status === "completed" ? (
                  <Check className="size-4 text-emerald-600" />
                ) : status === "invalid" ? (
                  <X className="size-4 text-destructive" />
                ) : Icon ? (
                  <Icon className="size-4" />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">{step.label}</span>
                {step.subtitle ? (
                  <span className="text-muted-foreground text-xs">
                    {step.subtitle}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function WizardProgressBar({
  config,
  wizard,
}: WizardProgressProps): React.ReactElement {
  const { t } = useTranslation("common");
  const { containerClassName } = splitStyleRuleClasses(config.styles);
  const stepLabel = config.stepLabel;
  const showLabel = shouldShowStepLabel(stepLabel);
  const labelPosition = resolveStepLabelPosition(stepLabel);
  const totalSteps = Math.max(wizard.steps.length, 1);
  const currentStep = Math.min(wizard.currentStepIndex + 1, totalSteps);
  const fillPercent = (currentStep / totalSteps) * 100;
  const labelText = t("forms.stepIndicator", {
    step: currentStep,
    total: totalSteps,
  });

  const labelColor = resolveStepLabelColorPresentation(stepLabel?.color);
  const labelFontSize = resolveStepLabelFontSizePresentation(
    stepLabel?.fontSize,
  );

  const labelElement = showLabel ? (
    <span
      className={cn(
        defaultStepLabelTextClassName(stepLabel?.fontSize),
        labelFontClassName(stepLabel ?? {}),
        labelColor.className,
        labelAlignClassName(stepLabel?.align),
        stepLabel?.italic && "italic",
        stepLabel?.underline && "underline",
        (labelPosition === "left" || labelPosition === "right") &&
          "shrink-0 whitespace-nowrap",
      )}
      style={{ ...labelColor.style, ...labelFontSize.style }}
    >
      {labelText}
    </span>
  ) : null;

  const barTrack = resolveBarTrackPresentation(config.barTrackColor);
  const barFill = resolveBarFillPresentation(config.barFillColor);

  const barElement = (
    <div
      className={cn(
        "h-2 min-w-0 flex-1 overflow-hidden rounded-full",
        barTrack.className,
      )}
      style={barTrack.style}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-200",
          barFill.className,
        )}
        style={{ width: `${fillPercent}%`, ...barFill.style }}
      />
    </div>
  );

  const isColumnLayout = labelPosition === "top" || labelPosition === "bottom";
  const labelFirst = labelPosition === "top" || labelPosition === "left";

  return (
    <div
      className={cn(
        containerClassName,
        isColumnLayout
          ? "flex w-full min-w-0 flex-col gap-1.5"
          : "flex w-full min-w-0 items-center gap-2",
      )}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuenow={currentStep}
      aria-label={labelText}
    >
      {labelFirst ? (
        <>
          {labelElement}
          {barElement}
        </>
      ) : (
        <>
          {barElement}
          {labelElement}
        </>
      )}
    </div>
  );
}

const DEFAULT_STEP_SPACING_PX = 16;
const DEFAULT_CIRCLE_SIZE_PX = 32;
const MIN_STEP_SPACING_PX = 8;
const MAX_STEP_SPACING_PX = 96;
const MIN_CIRCLE_SIZE_PX = 20;
const MAX_CIRCLE_SIZE_PX = 56;

function resolveStepSpacingPx(spacing?: number): number {
  if (spacing === undefined) {
    return DEFAULT_STEP_SPACING_PX;
  }
  return Math.min(
    MAX_STEP_SPACING_PX,
    Math.max(MIN_STEP_SPACING_PX, Math.round(spacing)),
  );
}

function resolveCircleSizePx(size?: number): number {
  if (size === undefined) {
    return DEFAULT_CIRCLE_SIZE_PX;
  }
  return Math.min(
    MAX_CIRCLE_SIZE_PX,
    Math.max(MIN_CIRCLE_SIZE_PX, Math.round(size)),
  );
}

function resolveLabelMaxWidthPx(maxWidth?: number): number | undefined {
  if (maxWidth === undefined) {
    return undefined;
  }
  return Math.min(320, Math.max(48, Math.round(maxWidth)));
}

function stepperIconSizePx(circleSizePx: number): number {
  return Math.max(12, Math.round(circleSizePx * 0.5));
}

function WizardProgressStepper({
  config,
  wizard,
}: WizardProgressProps): React.ReactElement {
  const { containerClassName } = splitStyleRuleClasses(config.styles);
  const stepLabelConfig = config.stepLabel;
  const showLabels = shouldShowStepLabel(stepLabelConfig);
  const labelPosition = resolveStepperLabelPosition(stepLabelConfig);
  const showTopLabels = showLabels && labelPosition === "top";
  const showBottomLabels = showLabels && labelPosition === "bottom";
  const showInlineLabels =
    showLabels && (labelPosition === "left" || labelPosition === "right");
  const stepSpacingPx = resolveStepSpacingPx(config.stepSpacing);
  const circleSizePx = resolveCircleSizePx(config.circleSize);
  const labelMaxWidthPx = resolveLabelMaxWidthPx(config.labelMaxWidth);
  const iconSizePx = stepperIconSizePx(circleSizePx);
  const stepColumnMinPx = Math.max(
    circleSizePx,
    labelMaxWidthPx ?? circleSizePx,
  );

  const renderStepLabel = (
    step: (typeof wizard.steps)[number],
    status: WizardStepStatusKind,
    alignment?: "center" | "left" | "right",
  ): React.ReactNode => {
    if (!showLabels || !step.label) {
      return null;
    }

    const labelPresentation = resolveStepperLabelPresentation(
      status,
      stepLabelConfig,
      config.conditionalStyles,
    );

    return (
      <span
        className={cn(
          labelPresentation.className,
          "inline-block min-w-0 px-1 leading-snug break-words whitespace-normal",
          alignment === "left"
            ? "text-left"
            : alignment === "right"
              ? "text-right"
              : "text-center",
        )}
        style={{
          ...labelPresentation.style,
          ...(labelMaxWidthPx !== undefined
            ? {
                width: `${labelMaxWidthPx}px`,
                maxWidth: `${labelMaxWidthPx}px`,
              }
            : {}),
        }}
      >
        {step.label}
      </span>
    );
  };

  const renderStepCircle = (
    step: (typeof wizard.steps)[number],
    index: number,
    status: WizardStepStatusKind,
  ): React.ReactElement => {
    const circle = resolveStepperCirclePresentation(
      status,
      config.conditionalStyles,
      circleSizePx,
    );
    const Icon = step.icon ? resolveLucideIcon(step.icon) : null;
    const iconStyle = { width: iconSizePx, height: iconSizePx };

    return (
      <span className={circle.className} style={circle.style} aria-hidden>
        {status === "completed" ? (
          <Check style={iconStyle} />
        ) : status === "invalid" ? (
          <X style={iconStyle} />
        ) : Icon ? (
          <Icon style={iconStyle} />
        ) : (
          index + 1
        )}
      </span>
    );
  };

  const circleGridRow = showTopLabels ? 2 : 1;
  const bottomLabelGridRow =
    showTopLabels && showBottomLabels
      ? 3
      : !showTopLabels && showBottomLabels
        ? 2
        : undefined;

  const gridTemplateColumns =
    wizard.steps.length > 1
      ? Array.from({ length: wizard.steps.length * 2 - 1 }, (_, index) =>
          index % 2 === 0
            ? `minmax(${stepColumnMinPx}px, max-content)`
            : `minmax(${stepSpacingPx}px, 1fr)`,
        ).join(" ")
      : `minmax(${stepColumnMinPx}px, max-content)`;

  return (
    <nav
      className={cn(containerClassName, "w-full min-w-0")}
      aria-label="Form steps"
    >
      <ol
        className="grid w-full min-w-0 list-none gap-y-2"
        style={{ gridTemplateColumns }}
      >
        {wizard.steps.map((step, index) => {
          const status = statusForStep(wizard, step.id);
          const stepGridColumn = index * 2 + 1;
          const leftStepStatus =
            index > 0
              ? statusForStep(wizard, wizard.steps[index - 1]!.id)
              : undefined;
          const connector =
            index > 0 && leftStepStatus
              ? resolveStepperConnectorPresentation(
                  leftStepStatus,
                  config.conditionalStyles,
                )
              : undefined;

          return (
            <Fragment key={step.id}>
              {showTopLabels ? (
                <li
                  className="flex min-w-0 justify-center px-1"
                  style={{ gridColumn: stepGridColumn, gridRow: 1 }}
                >
                  {renderStepLabel(step, status)}
                </li>
              ) : null}

              {index > 0 && connector ? (
                <li
                  aria-hidden
                  className="flex items-center"
                  style={{
                    gridColumn: index * 2,
                    gridRow: circleGridRow,
                    height: circleSizePx,
                  }}
                >
                  <div
                    className={cn("h-px w-full", connector.className)}
                    style={connector.style}
                  />
                </li>
              ) : null}

              <li
                aria-current={status === "active" ? "step" : undefined}
                className="relative flex min-w-0 items-center justify-center"
                style={{
                  gridColumn: stepGridColumn,
                  gridRow: circleGridRow,
                  height: circleSizePx,
                }}
              >
                {showInlineLabels && labelPosition === "left" ? (
                  <span
                    className="absolute top-1/2 right-full mr-2 -translate-y-1/2"
                    style={
                      labelMaxWidthPx !== undefined
                        ? {
                            width: `${labelMaxWidthPx}px`,
                            maxWidth: `${labelMaxWidthPx}px`,
                          }
                        : undefined
                    }
                  >
                    {renderStepLabel(step, status, "right")}
                  </span>
                ) : null}
                {renderStepCircle(step, index, status)}
                {showInlineLabels && labelPosition === "right" ? (
                  <span
                    className="absolute top-1/2 left-full ml-2 -translate-y-1/2"
                    style={
                      labelMaxWidthPx !== undefined
                        ? {
                            width: `${labelMaxWidthPx}px`,
                            maxWidth: `${labelMaxWidthPx}px`,
                          }
                        : undefined
                    }
                  >
                    {renderStepLabel(step, status, "left")}
                  </span>
                ) : null}
              </li>

              {bottomLabelGridRow !== undefined ? (
                <li
                  className="flex min-w-0 justify-center px-1"
                  style={{
                    gridColumn: stepGridColumn,
                    gridRow: bottomLabelGridRow,
                  }}
                >
                  {renderStepLabel(step, status)}
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export function WizardProgress({ config, wizard }: WizardProgressProps) {
  const variant = resolveWizardProgressVariant(config);

  if (variant === "bar") {
    return <WizardProgressBar config={config} wizard={wizard} />;
  }

  if (variant === "stepper") {
    return <WizardProgressStepper config={config} wizard={wizard} />;
  }

  return <WizardProgressSteps config={config} wizard={wizard} />;
}
