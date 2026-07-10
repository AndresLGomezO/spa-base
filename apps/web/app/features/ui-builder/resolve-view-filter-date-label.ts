import type {
  LabelConfig,
  TextColorToken,
  ViewDateFilterComponentConfig,
} from "@repo/ui-builder-core";

interface ResolvedViewFilterDateLabel {
  readonly show: boolean;
  readonly text: string;
  readonly position: NonNullable<LabelConfig["position"]>;
  readonly bold?: boolean;
  readonly thin?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly color?: TextColorToken;
  readonly align?: LabelConfig["align"];
}

export function resolveViewFilterDateLabel(
  config: ViewDateFilterComponentConfig,
  defaultText: string,
): ResolvedViewFilterDateLabel {
  const label = config.label;

  if (label?.show === false) {
    return {
      show: false,
      text: defaultText,
      position: label.position ?? "above",
    };
  }

  return {
    show: true,
    text: label?.text?.trim() || defaultText,
    position: label?.position ?? "above",
    bold: label?.bold,
    thin: label?.thin,
    italic: label?.italic,
    underline: label?.underline,
    color: label?.color,
    align: label?.align,
  };
}

export function viewFilterDateLabelColorClassName(
  color?: TextColorToken,
): string {
  switch (color) {
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
    case "default":
      return "text-foreground";
    case "muted":
    default:
      return "text-muted-foreground";
  }
}

export function viewFilterDateLabelAlignClassName(
  align?: LabelConfig["align"],
): string | undefined {
  if (align === "center") {
    return "text-center";
  }
  if (align === "right") {
    return "text-right";
  }
  return undefined;
}
