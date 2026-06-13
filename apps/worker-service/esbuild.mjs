import * as esbuild from "esbuild";

// Bundle workspace TypeScript; keep npm packages with native/dynamic loads external.
const external = [
  "@google-cloud/firestore",
  "@google-cloud/pubsub",
  "@google-cloud/vertexai",
  "@google/genai",
  "google-auth-library",
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

const { size } = await import("node:fs/promises").then((fs) =>
  fs.stat("dist/index.js"),
);
const maxBundleBytes = 200_000;
if (size > maxBundleBytes) {
  throw new Error(
    `worker-service dist/index.js is ${size} bytes (max ${maxBundleBytes}). ` +
      "A GCP client was likely bundled into ESM output; check esbuild externals.",
  );
}
