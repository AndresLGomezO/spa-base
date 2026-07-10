import type { StylePropertyKey, StyleRule } from "./style-types.js";

const VISUAL_CHROME_STYLE_PROPERTIES = new Set<StylePropertyKey>([
  "backgroundColor",
  "borderWidth",
  "borderColor",
  "borderStyle",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "boxShadow",
  "backdropFilter",
  "opacity",
]);

const INTERACTIVE_TRANSITION =
  "transition-[color,background-color,border-color,box-shadow]";

export function interactiveNotificationBellIconClass(isActive = false): string {
  return [
    "transition-colors",
    "text-muted-foreground",
    "group-hover:text-[var(--color-primary-hover)]",
    "group-active:text-[var(--color-primary-active)]",
    "group-focus-visible:text-primary",
    isActive ? "text-[var(--color-primary-active)]" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function interactiveSearchFieldClass(isFocused = false): string {
  return [
    INTERACTIVE_TRANSITION,
    "hover:border-[var(--color-primary-hover)]",
    "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15",
    "active:border-[var(--color-primary-active)]",
    isFocused ? "border-[var(--color-primary-active)]" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function stylesIncludeVisualChrome(
  styles: readonly StyleRule[] | undefined,
): boolean {
  return (styles ?? []).some((rule) =>
    VISUAL_CHROME_STYLE_PROPERTIES.has(rule.property),
  );
}

export function interactiveTriggerBaseClass(hasCustomChrome: boolean): string {
  return hasCustomChrome
    ? "h-auto font-normal focus-visible:ring-offset-0"
    : "h-auto border-0 font-normal shadow-none focus-visible:ring-offset-0";
}
