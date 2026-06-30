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
    files: [
      "src/firebase-admin.ts",
      "src/build-firestore-filter-tree.ts",
      "src/firestore-admin-user-repository.ts",
      "src/firestore-admin-entity-repository.ts",
      "src/firestore-admin-join-collection-repository.ts",
      "src/firestore-entity-query-executor.ts",
      "src/tenant-entity-path.ts",
      "src/replace-tenant-collection-documents.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];
