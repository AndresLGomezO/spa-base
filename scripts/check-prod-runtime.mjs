/**
 * Simulates Cloud Run prod layout: pnpm deploy --prod + resolve each npm import in dist/index.js.
 *
 * Deploy layouts are created outside the repo tree so Node cannot resolve packages via the
 * hoisted monorepo node_modules (which would mask missing prod dependencies).
 *
 * Requires prior build (turbo run build or per-app `pnpm build`).
 *
 * Usage:
 *   pnpm run check:prod-runtime
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { collectNpmImports } from "../packages/esbuild-runtime-deps/index.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TARGETS = [
  {
    appName: "api",
    filter: "api",
    runtimeAssets: ["dist/platform-formulas.json", "dist/formula-admin.js"],
  },
  {
    appName: "worker-service",
    filter: "worker-service",
    runtimeAssets: ["dist/platform-formulas.json"],
  },
  { appName: "worker-aggregation", filter: "worker-aggregation" },
];

function run(command, options = {}) {
  const result = spawnSync(command, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: true,
    ...options,
  });
  return result;
}

function assertBuilt(appName, filter) {
  const bundlePath = join(repoRoot, "apps", filter, "dist/index.js");
  if (!existsSync(bundlePath)) {
    throw new Error(
      `${appName}: missing ${bundlePath}. Run turbo build or pnpm --filter ${filter} build first.`,
    );
  }
}

function deployProd(filter, deployDir) {
  rmSync(deployDir, { recursive: true, force: true });
  const result = run(
    `pnpm --filter=${filter} deploy --prod --legacy ${deployDir}`,
  );
  if (result.status !== 0) {
    throw new Error(
      `${filter}: pnpm deploy failed:\n${result.stdout}\n${result.stderr}`.trim(),
    );
  }
}

function packageJsonPath(deployDir, pkg) {
  return join(deployDir, "node_modules", ...pkg.split("/"), "package.json");
}

function assertPackagePresent(appName, deployDir, pkg) {
  const pkgJsonPath = packageJsonPath(deployDir, pkg);
  if (!existsSync(pkgJsonPath)) {
    throw new Error(
      `${appName}: missing ${pkgJsonPath} in prod deploy layout (${deployDir}). ` +
        `Add "${pkg}" to dependencies in package.json.`,
    );
  }
}

function assertImportsResolvable(appName, deployDir, bundlePath) {
  const bundle = readFileSync(bundlePath, "utf8");
  const imports = [...collectNpmImports(bundle)].sort();

  for (const pkg of imports) {
    assertPackagePresent(appName, deployDir, pkg);

    const snippet = `import(${JSON.stringify(pkg)})`;
    const result = spawnSync(
      "node",
      ["--input-type=module", "--eval", snippet],
      {
        cwd: deployDir,
        encoding: "utf8",
      },
    );
    if (result.status !== 0) {
      throw new Error(
        `${appName}: cannot resolve "${pkg}" in prod deploy layout (${deployDir}).\n${result.stderr}`.trim(),
      );
    }
  }
}

function assertRuntimeAssets(appName, deployDir, runtimeAssets = []) {
  for (const relativePath of runtimeAssets) {
    const assetPath = join(deployDir, relativePath);
    if (!existsSync(assetPath)) {
      throw new Error(
        `${appName}: missing runtime asset ${assetPath} in prod deploy layout (${deployDir}).`,
      );
    }
  }
}

function main() {
  const deployRoot = mkdtempSync(join(tmpdir(), "prod-runtime-"));

  try {
    for (const { appName, filter, runtimeAssets } of TARGETS) {
      assertBuilt(appName, filter);
      const deployDir = join(deployRoot, filter);
      deployProd(filter, deployDir);

      const bundlePath = join(deployDir, "dist/index.js");
      if (!existsSync(bundlePath)) {
        throw new Error(`${appName}: deploy layout missing ${bundlePath}`);
      }

      assertRuntimeAssets(appName, deployDir, runtimeAssets);
      assertImportsResolvable(appName, deployDir, bundlePath);
      console.log(
        `✓ ${appName}: prod deploy layout resolves all bundle imports`,
      );
    }

    console.log(
      `\nProd runtime check passed (${TARGETS.length}/${TARGETS.length} apps).`,
    );
  } finally {
    rmSync(deployRoot, { recursive: true, force: true });
  }
}

main();
