import * as esbuild from "esbuild";
import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assertDirectRuntimeDependencies } from "../../scripts/assert-esbuild-runtime-deps.mjs";

const npmExternals = [
  "@google-cloud/firestore",
  "@google-cloud/pubsub",
  "@google-cloud/vertexai",
  "@google/genai",
  "google-auth-library",
  "firebase-admin",
  "zod",
];

const forceExternalPlugin = {
  name: "force-gcp-external",
  setup(build) {
    const markExternal = (args) => ({ path: args.path, external: true });
    build.onResolve({ filter: /^@google-cloud\// }, markExternal);
    build.onResolve({ filter: /^@google\/genai/ }, markExternal);
    build.onResolve({ filter: /^google-auth-library/ }, markExternal);
  },
};

const rootDir = dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: "dist/index.js",
  sourcemap: true,
  packages: "bundle",
  external: npmExternals,
  plugins: [forceExternalPlugin],
  logLevel: "info",
});

assertDirectRuntimeDependencies({
  appName: "worker-aggregation",
  bundlePath: join(rootDir, "dist/index.js"),
  packageJsonPath: join(rootDir, "package.json"),
});

const { size } = await stat("dist/index.js");
const maxBundleBytes = 500_000;
if (size > maxBundleBytes) {
  throw new Error(
    `worker-aggregation dist/index.js is ${size} bytes (max ${maxBundleBytes}). ` +
      "A GCP client was likely bundled into ESM output.",
  );
}

const bundle = await readFile("dist/index.js", "utf8");
if (bundle.includes("__require2") || bundle.includes("google-auth-library")) {
  throw new Error(
    "worker-aggregation bundle contains inlined google-auth-library — check esbuild externals.",
  );
}
