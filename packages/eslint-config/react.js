import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import baseConfig from "./base.js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ...react.configs.flat["jsx-runtime"],
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  reactHooks.configs["recommended-latest"],
];
