import reactConfig from "@repo/eslint-config/react";
import uiPrimitives from "@repo/eslint-config/ui-primitives";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...reactConfig,
  ...uiPrimitives,
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@repo/rbac-core",
              message:
                "Import @repo/rbac-app only. Slice engine is for package authors.",
            },
            {
              name: "@repo/rbac-base",
              message:
                "Import @repo/rbac-app only. Base slice is composed in rbac-app.",
            },
            {
              name: "@repo/rbac-example",
              message:
                "Import @repo/rbac-app only. Module slices are merged in rbac-app.",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ["build/**", ".react-router/**", "cypress/**", "scripts/**"],
  },
];
