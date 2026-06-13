import * as esbuild from "esbuild";
import { readFile, stat } from "node:fs/promises";

// Bundle workspace TypeScript packages into dist; keep npm packages with native/dynamic loads external.
const npmExternals = [
  "@google-cloud/firestore",
  "@google-cloud/pubsub",
  "@google-cloud/vertexai",
  "@google/genai",
  "google-auth-library",
  "firebase-admin",
  "fastify",
  "@fastify/cors",
  "@fastify/compress",
  "@fastify/rate-limit",
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

const { size } = await stat("dist/index.js");
const maxBundleBytes = 2_000_000;
if (size > maxBundleBytes) {
  throw new Error(
    `api dist/index.js is ${size} bytes (max ${maxBundleBytes}). ` +
      "A GCP client was likely bundled into ESM output.",
  );
}

const bundle = await readFile("dist/index.js", "utf8");
if (
  bundle.includes("__require2") ||
  bundle.includes("google-auth-library") ||
  bundle.includes("@google-cloud/vertexai")
) {
  throw new Error(
    "api bundle contains inlined GCP/Vertex client code — check esbuild externals and @repo/ai-engine imports.",
  );
}
