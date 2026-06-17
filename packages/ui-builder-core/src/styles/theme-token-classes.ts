import type { TextColorToken } from "../types/styling.js";
import type { ThemeToken } from "./style-types.js";

/** How a theme token is applied when picking a swatch in the style editor. */
export type ThemeColorRole = "background" | "text" | "border";

/** Text color utilities aligned with `@repo/ui` card field tokens and theme semantics. */
export function themeTokenTextClass(
  token: ThemeToken | TextColorToken,
): string {
  switch (token) {
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
    case "transparent":
      return "text-transparent";
    case "background":
    case "foreground":
    case "default":
    default:
      return "text-foreground";
  }
}

export function themeTokenBackgroundClass(token: ThemeToken): string {
  switch (token) {
    case "muted":
      return "bg-muted";
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
    case "background":
      return "bg-background";
    case "foreground":
      return "bg-foreground/10";
    case "transparent":
      return "bg-transparent";
    default:
      return "bg-muted";
  }
}

/**
 * Tailwind class for the color swatch in UI Builder editors.
 * Mirrors the classes used at render time for the given role.
 */
export function themeTokenSwatchClass(
  role: ThemeColorRole,
  token: ThemeToken | TextColorToken,
): string {
  const sourceClass =
    role === "background"
      ? themeTokenBackgroundClass(token as ThemeToken)
      : role === "text"
        ? themeTokenTextClass(token)
        : themeTokenBorderClass(token as ThemeToken);

  if (sourceClass.startsWith("bg-")) {
    return sourceClass;
  }

  if (sourceClass.startsWith("text-")) {
    return `bg-${sourceClass.slice(5)}`;
  }

  if (sourceClass.startsWith("border-")) {
    return `bg-${sourceClass.slice(7)}`;
  }

  return sourceClass;
}

export function themeTokenBorderClass(token: ThemeToken): string {
  switch (token) {
    case "muted":
      return "border-muted";
    case "primary":
      return "border-primary";
    case "success":
      return "border-success";
    case "warning":
      return "border-warning";
    case "danger":
      return "border-destructive";
    case "info":
      return "border-info";
    case "background":
      return "border-background";
    case "foreground":
      return "border-foreground";
    case "transparent":
      return "border-transparent";
    default:
      return "border-border";
  }
}
