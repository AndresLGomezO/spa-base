import * as esbuild from "esbuild";

const external = [
  "@google-cloud/firestore",
  "@google-cloud/pubsub",
  "firebase-admin",
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
