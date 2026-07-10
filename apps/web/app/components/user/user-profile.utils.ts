import type { UserAvatarShape } from "@repo/ui-builder-core";

export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function avatarShapeClassName(
  avatarShape: UserAvatarShape | undefined,
): string {
  switch (avatarShape) {
    case "circle":
      return "rounded-full";
    case "square":
      return "rounded-none";
    case "rounded":
    default:
      return "rounded-md";
  }
}
