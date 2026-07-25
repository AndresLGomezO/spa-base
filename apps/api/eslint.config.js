import baseConfig from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    files: ["**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "firebase-admin/firestore",
              message:
                "Use @repo/gcp-firebase repository modules instead of direct Firestore access.",
            },
            {
              name: "firebase/firestore",
              message:
                "Use API repository modules instead of direct client Firestore access.",
            },
          ],
          patterns: [
            {
              group: [
                "@repo/ai-engine/clients/internal/*",
                "@repo/ai-engine/**/clients/internal/**",
              ],
              message:
                "Call AI through createAiController / runAiRequest; do not import internal model clients.",
            },
          ],
        },
      ],
    },
  },
];
