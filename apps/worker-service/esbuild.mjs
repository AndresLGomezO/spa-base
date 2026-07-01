import * as esbuild from "esbuild";
import { cpSync, mkdirSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assertDirectRuntimeDependencies } from "../../scripts/assert-esbuild-runtime-deps.mjs";

// Bundle workspace TypeScript packages into dist; keep npm packages with native/dynamic loads external.
const npmExternals = [
  "@google-cloud/firestore",
  "@google-cloud/pubsub",
  "@google-cloud/vertexai",
  "@google/genai",
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
    build.onResolve({ filter: /^cron-parser/ }, markExternal);
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

const generatedSrc = join(rootDir, "../../packages/ai-context/src/generated");
const generatedDest = join(rootDir, "dist/ai-context-generated");
mkdirSync(generatedDest, { recursive: true });
cpSync(generatedSrc, generatedDest, { recursive: true });

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
if (bundle.includes("__require2") || bundle.includes("google-auth-library")) {
  throw new Error(
    "worker-service bundle contains inlined google-auth-library — check esbuild externals.",
  );
}
