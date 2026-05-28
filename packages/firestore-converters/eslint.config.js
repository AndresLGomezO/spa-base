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
              name: "firebase/firestore",
              message:
                "Firestore SDK access must stay in repository adapters, not converter modules.",
            },
            {
              name: "firebase-admin/firestore",
              message:
                "Firestore Admin SDK access must stay in repository adapters, not converter modules.",
            },
          ],
        },
      ],
    },
  },
];
