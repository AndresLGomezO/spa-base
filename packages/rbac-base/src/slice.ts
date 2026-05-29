import { defineRbacSlice } from "@repo/rbac-core";

export const PLATFORM_PERMISSIONS = [
  "user:view_self",
  "user:view_all",
  "user:update_self",
  "user:update_all",
  "team:view",
  "team:manage",
  "billing:view",
  "billing:manage",
  "role:assign",
] as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

export const PLATFORM_ROLE = {
  ADMIN: "admin",
  MEMBER: "member",
} as const;

export const PLATFORM_ROLES = [
  PLATFORM_ROLE.ADMIN,
  PLATFORM_ROLE.MEMBER,
] as const;

export type PlatformRole = (typeof PLATFORM_ROLE)[keyof typeof PLATFORM_ROLE];

export const baseRbacSlice = defineRbacSlice({
  id: "platform",
  permissions: PLATFORM_PERMISSIONS,
  roles: {
    [PLATFORM_ROLE.ADMIN]: {
      weight: 100,
      permissions: [],
      isSuperAdmin: true,
    },
    [PLATFORM_ROLE.MEMBER]: {
      weight: 10,
      permissions: [
        "user:view_self",
        "user:update_self",
        "team:view",
        "billing:view",
      ],
    },
  },
  roleLabels: {
    [PLATFORM_ROLE.ADMIN]: "Admin",
    [PLATFORM_ROLE.MEMBER]: "Member",
  },
});
