import { PLATFORM_SUPERADMIN } from "./types.js";

export function isPlatformSuperAdmin(
  platformRole: string | null | undefined,
): boolean {
  if (!platformRole) {
    return false;
  }

  const normalized = platformRole.trim().toLowerCase();
  return (
    normalized === "superadmin" ||
    normalized === PLATFORM_SUPERADMIN.toLowerCase()
  );
}
