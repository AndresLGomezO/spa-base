import baseConfig from "@repo/eslint-config/base";

export default [
  ...baseConfig,
  {
    files: ["**/*.{ts,tsx}"],
    ignores: [
      "src/clients/internal/**",
      "src/controller/**",
      "src/process-ai-chat.ts",
      "src/process-ai-ui-builder.ts",
      "src/ui-builder-orchestrator/step-runner.ts",
      // Public type/constant facades re-export from internal modules.
      "src/vertex-ai.client.ts",
      "src/text-embedding.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/clients/internal/**",
                "./clients/internal/*",
                "../clients/internal/*",
                "../../clients/internal/*",
              ],
              message:
                "Import AI model clients only from the controller folder via createAiController / runAiRequest.",
            },
          ],
        },
      ],
    },
  },
];
