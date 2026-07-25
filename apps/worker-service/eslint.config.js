import baseConfig from "@repo/eslint-config/base";

export default [
  ...baseConfig,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
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
