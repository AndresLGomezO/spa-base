import {
  ORGANIZATION_PERMISSIONS,
  PROJECT_PERMISSIONS,
} from "@repo/shared-types";

export const ALL_KNOWN_PERMISSIONS = [
  ...ORGANIZATION_PERMISSIONS,
  ...PROJECT_PERMISSIONS,
] as const;

export type KnownPermission = (typeof ALL_KNOWN_PERMISSIONS)[number];
