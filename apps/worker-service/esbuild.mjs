import * as esbuild from "esbuild";

// Bundle workspace TypeScript; keep npm packages with native/dynamic loads external.
const external = [
  "@google-cloud/firestore",
  "@google-cloud/pubsub",
  "@google-cloud/vertexai",
  "firebase-admin",
  "fastify",
  "zod",
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
