import type { LucideIcon } from "lucide-react";

/** Lucide React icons expose `displayName` (e.g. "Home", "Bot"). */
export function lucideIconDisplayName(icon: LucideIcon): string | undefined {
  const name = icon.displayName?.trim();
  return name && name.length > 0 ? name : undefined;
}
