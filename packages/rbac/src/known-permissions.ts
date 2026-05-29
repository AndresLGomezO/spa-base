import { CUSTOMER_PERMISSIONS, ORDER_PERMISSIONS } from "@repo/shared-types";

export const ALL_KNOWN_PERMISSIONS = [
  ...CUSTOMER_PERMISSIONS,
  ...ORDER_PERMISSIONS,
] as const;

export type KnownPermission = (typeof ALL_KNOWN_PERMISSIONS)[number];
