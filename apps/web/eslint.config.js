import reactConfig from "@repo/eslint-config/react";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...reactConfig,
  {
    ignores: ["build/**", ".react-router/**", "cypress/**"],
  },
];
