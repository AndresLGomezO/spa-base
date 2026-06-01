import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Database } from "lucide-react";

export function resolveLucideIcon(name: string | undefined): LucideIcon {
  if (!name?.trim()) {
    return Database;
  }

  const icon = (
    LucideIcons as unknown as Record<string, LucideIcon | undefined>
  )[name.trim()];
  return icon ?? Database;
}
