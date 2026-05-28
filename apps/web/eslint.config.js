import reactConfig from "@repo/eslint-config/react";
import uiPrimitives from "@repo/eslint-config/ui-primitives";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...reactConfig,
  ...uiPrimitives,
  {
    ignores: ["build/**", ".react-router/**", "cypress/**", "scripts/**"],
  },
];
