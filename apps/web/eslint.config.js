import reactConfig from "@repo/eslint-config/react";
import uiOverlays from "@repo/eslint-config/ui-overlays";
import uiPrimitives from "@repo/eslint-config/ui-primitives";
import uiToasts from "@repo/eslint-config/ui-toasts";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...reactConfig,
  ...uiPrimitives,
  ...uiOverlays,
  ...uiToasts,
  {
    ignores: ["build/**", ".react-router/**", "cypress/**", "scripts/**"],
  },
];
