import { readFileSync } from "node:fs";
import { builtinModules } from "node:module";

const NODE_BUILTINS = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]);

/**
 * Map a module specifier to its npm package name.
 * e.g. firebase-admin/firestore -> firebase-admin, @scope/pkg/sub -> @scope/pkg
 */
export function npmPackageName(specifier) {
  if (
    specifier.startsWith("./") ||
    specifier.startsWith("../") ||
    specifier.startsWith("node:") ||
    NODE_BUILTINS.has(specifier)
  ) {
    return null;
  }
  let name;
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    name = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  } else {
    name = specifier.split("/")[0] ?? null;
  }
  if (!name || name.includes("${") || name.includes("{")) {
    return null;
  }
  if (!/^(@[a-z0-9][\w.-]*\/[a-z0-9][\w.-]*|[a-z0-9][\w.-]*)$/i.test(name)) {
    return null;
  }
  if (NODE_BUILTINS.has(name)) {
    return null;
  }
  return name;
}

/**
 * Collect npm package names from static import/export specifiers in bundled output.
 */
export function collectNpmImports(bundleSource) {
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

/**
 * Ensure every npm import in the bundle is a direct dependency (required for pnpm deploy --prod).
 */
export function assertDirectRuntimeDependencies({
  appName,
  bundlePath,
  packageJsonPath,
}) {
  const bundle = readFileSync(bundlePath, "utf8");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const dependencies = packageJson.dependencies ?? {};
  const npmImports = collectNpmImports(bundle);
  const missing = [...npmImports]
    .filter((pkg) => !Object.hasOwn(dependencies, pkg))
    .sort();

  if (missing.length > 0) {
    throw new Error(
      `${appName} dist/index.js imports npm packages that are not direct dependencies in package.json: ${missing.join(", ")}. ` +
        "Add each to dependencies (and esbuild externals when CJS/GCP).",
    );
  }
}
