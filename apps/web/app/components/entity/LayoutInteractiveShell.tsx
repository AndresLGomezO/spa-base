import type { CSSProperties, ReactNode } from "react";

import type { LabelConfig, StyleRule } from "@repo/ui-builder-core";
import {
  filterComponentInnerStyleRules,
  resolveMetricKpiPresentation,
  type MetricKpiPresentation,
} from "@repo/ui-builder-core";
import { CardFieldValue } from "@repo/ui";
import { ResponsiveStyleTag } from "@repo/ui-builder-renderer";
import { cn } from "@repo/theme/utils";

function labelAlignClassName(align?: LabelConfig["align"]): string | undefined {
  if (align === "center") {
    return "text-center";
  }
  if (align === "right") {
    return "text-right";
  }
  return undefined;
}

export function useLayoutInteractivePresentation(
  styles: readonly StyleRule[] | undefined,
): MetricKpiPresentation {
  return resolveMetricKpiPresentation(filterComponentInnerStyleRules(styles));
}

interface LayoutInteractiveShellProps {
  readonly styles: readonly StyleRule[] | undefined;
  readonly label?: LabelConfig;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly children: (presentation: MetricKpiPresentation) => ReactNode;
}

export function LayoutInteractiveShell({
  styles,
  label,
  className,
  style,
  children,
}: LayoutInteractiveShellProps) {
  const presentation = useLayoutInteractivePresentation(styles);
  const labelText = label?.text?.trim();
  const showLabel = label?.show === true && Boolean(labelText);
  const content = (
    <>
      <ResponsiveStyleTag cssText={presentation.cssText} />
      {children(presentation)}
    </>
  );

  if (!showLabel) {
    return (
      <div
        className={cn(
          "w-fit max-w-full shrink-0",
          presentation.className,
          className,
        )}
        style={{ ...presentation.style, ...style }}
      >
        {content}
      </div>
    );
  }

  return (
    <CardFieldValue
      label={labelText}
      showLabel={showLabel}
      labelPosition={label?.position ?? "above"}
      labelUppercase={false}
      value={content}
      allowEmpty
      className={cn(
        "w-fit max-w-full shrink-0",
        presentation.className,
        className,
      )}
      style={{ ...presentation.style, ...style }}
      labelClassName={labelAlignClassName(label?.align)}
      valueClassName={presentation.valueClassName}
      valueStyle={presentation.valueStyle}
      textSize={presentation.textSize}
      textBold={label?.bold}
      textThin={label?.thin}
      textItalic={label?.italic}
      textUnderline={label?.underline}
      textColor={label?.color}
    />
  );
}
