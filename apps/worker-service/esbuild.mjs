import * as esbuild from "esbuild";
import { cpSync, mkdirSync } from "node:fs";
import { copyFile, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assertDirectRuntimeDependencies } from "@repo/esbuild-runtime-deps";

// Bundle workspace TypeScript packages into dist; keep npm packages with native/dynamic loads external.
const npmExternals = [
  "@google-cloud/aiplatform",
  "@google-cloud/firestore",
  "@google-cloud/pubsub",
  "@google-cloud/tasks",
  "@google-cloud/vertexai",
  "@google/genai",
  "google-auth-library",
  "cron-parser",
  "firebase-admin",
  "fastify",
];

const forceExternalPlugin = {
  name: "force-gcp-external",
  setup(build) {
    const markExternal = (args) => ({ path: args.path, external: true });
    build.onResolve({ filter: /^@google-cloud\// }, markExternal);
    build.onResolve({ filter: /^@google\/genai/ }, markExternal);
    build.onResolve({ filter: /^google-auth-library/ }, markExternal);
    build.onResolve({ filter: /^cron-parser/ }, markExternal);
  },
};

const rootDir = dirname(fileURLToPath(import.meta.url));
const platformFormulasSource = join(
  rootDir,
  "../../packages/formula-definitions/src/platform-formulas.json",
);

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

const generatedSrc = join(rootDir, "../../packages/ai-context/src/generated");
const generatedDest = join(rootDir, "dist/ai-context-generated");
mkdirSync(generatedDest, { recursive: true });
cpSync(generatedSrc, generatedDest, { recursive: true });

await copyFile(
  platformFormulasSource,
  join(rootDir, "dist/platform-formulas.json"),
);

assertDirectRuntimeDependencies({
  appName: "worker-service",
  bundlePath: join(rootDir, "dist/index.js"),
  packageJsonPath: join(rootDir, "package.json"),
});

const { size } = await stat("dist/index.js");
const maxBundleBytes = 4_000_000;
if (size > maxBundleBytes) {
  throw new Error(
    `worker-service dist/index.js is ${size} bytes (max ${maxBundleBytes}).`,
  );
}

const bundle = await readFile("dist/index.js", "utf8");
// Dynamic `import("google-auth-library")` remains as an external string; fail only on CJS inlining.
if (bundle.includes("__require2")) {
  throw new Error(
    "worker-service bundle contains inlined CJS GCP client code — check esbuild externals.",
  );
}
