import { defineRbacSlice } from "@repo/rbac-core";

/**
 * Example domain slice for documentation and merge tests.
 * Remove or exclude from product rbac-app when not needed.
 */
export const EXAMPLE_PERMISSIONS = [
  "example.report.read",
  "example.report.export",
] as const;

export type ExamplePermission = (typeof EXAMPLE_PERMISSIONS)[number];

export const EXAMPLE_ROLE = {
  DEMO_VIEWER: "demo_viewer",
} as const;

export type ExampleRole = (typeof EXAMPLE_ROLE)[keyof typeof EXAMPLE_ROLE];

export const exampleRbacSlice = defineRbacSlice({
  id: "example",
  permissions: EXAMPLE_PERMISSIONS,
  roles: {
    [EXAMPLE_ROLE.DEMO_VIEWER]: {
      weight: 20,
      permissions: ["example.report.read"],
    },
  },
  roleLabels: {
    [EXAMPLE_ROLE.DEMO_VIEWER]: "Demo viewer",
  },
});
