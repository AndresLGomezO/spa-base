import * as esbuild from "esbuild";

// Bundle workspace TypeScript packages into dist; keep npm packages with native/dynamic loads external.
const external = [
  "@google-cloud/firestore",
  "@google-cloud/pubsub",
  "firebase-admin",
  "fastify",
  "@fastify/cors",
  "@fastify/compress",
  "@fastify/rate-limit",
];

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: "dist/index.js",
  sourcemap: true,
  packages: "bundle",
  external,
  logLevel: "info",
});
