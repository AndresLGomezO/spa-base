import baseConfig from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    files: ["src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "firebase-admin/firestore",
              message:
                "Use the dedicated repository adapter module for Firestore reads/writes.",
            },
            {
              name: "firebase/firestore",
              message:
                "Client Firestore SDK is not allowed in server Firebase package.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/firestore-admin-user-repository.ts", "src/firebase-admin.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];
