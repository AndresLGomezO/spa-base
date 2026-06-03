export type CardTextColor =
  | "default"
  | "muted"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export const CARD_TEXT_COLOR_OPTIONS: readonly CardTextColor[] = [
  "default",
  "muted",
  "primary",
  "success",
  "warning",
  "danger",
  "info",
];

export function cardTextColorClassName(color?: CardTextColor): string {
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
