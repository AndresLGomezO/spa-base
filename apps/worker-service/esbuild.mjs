import * as esbuild from "esbuild";
import { cpSync, mkdirSync, readFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

function npmPackageName(specifier) {
  if (
    specifier.startsWith("./") ||
    specifier.startsWith("../") ||
    specifier.startsWith("node:")
  ) {
    return null;
  }
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split("/")[0] ?? null;
}

function collectNpmImports(bundleSource) {
  const imports = new Set();
  const importRe =
    /\b(?:import|export)\s+(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']/g;
  for (const match of bundleSource.matchAll(importRe)) {
    const pkg = npmPackageName(match[1]);
    if (pkg) {
      imports.add(pkg);
    }
  }
  return imports;
}

function assertDirectRuntimeDependencies(bundlePath, packageJsonPath) {
  const bundle = readFileSync(bundlePath, "utf8");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const dependencies = packageJson.dependencies ?? {};
  const npmImports = collectNpmImports(bundle);
  const missing = [...npmImports]
    .filter((pkg) => !Object.hasOwn(dependencies, pkg))
    .sort();

  if (missing.length > 0) {
    throw new Error(
      `worker-service dist/index.js imports npm packages that are not direct dependencies in package.json: ${missing.join(", ")}. ` +
        "Add each to dependencies (and esbuild externals when CJS/GCP).",
    );
  }
}

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

assertDirectRuntimeDependencies(
  join(rootDir, "dist/index.js"),
  join(rootDir, "package.json"),
);

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
