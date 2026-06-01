/**
 * Ensures dev Dockerfiles COPY every workspace package required for `pnpm install`.
 *
 * Usage:
 *   pnpm check:docker-workspace
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

interface PackageManifest {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface DockerTarget {
  id: string;
  dockerfile: string;
  entryManifests: string[];
}

const TARGETS: DockerTarget[] = [
  {
    id: "web",
    dockerfile: "apps/web/Dockerfile.dev",
    entryManifests: ["apps/web/package.json", "apps/platform/package.json", "package.json"],
  },
  {
    id: "api",
    dockerfile: "apps/api/Dockerfile.dev",
    entryManifests: ["apps/api/package.json", "apps/platform/package.json", "package.json"],
  },
];

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function listManifestPaths(): string[] {
  const paths: string[] = ["package.json"];

  for (const dir of ["packages", "apps"] as const) {
    const base = join(repoRoot, dir);
    if (!existsSync(base)) continue;

    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifest = join(base, entry.name, "package.json");
      if (existsSync(manifest)) paths.push(`${dir}/${entry.name}/package.json`);
    }
  }

  return paths;
}

function buildNameToDirMap(): Map<string, string> {
  const map = new Map<string, string>();

  for (const relPath of listManifestPaths()) {
    const manifest = readJson<PackageManifest>(join(repoRoot, relPath));
    if (!manifest.name) continue;
    const dir = dirname(relPath);
    map.set(manifest.name, dir);
  }

  return map;
}

function workspaceDeps(manifest: PackageManifest): string[] {
  const specs: string[] = [];
  for (const section of [manifest.dependencies, manifest.devDependencies]) {
    if (!section) continue;
    for (const [name, version] of Object.entries(section)) {
      if (version === "workspace:*" || version.startsWith("workspace:")) {
        specs.push(name);
      }
    }
  }
  return specs;
}

function workspaceClosure(
  entryManifests: readonly string[],
  nameToDir: Map<string, string>,
): Set<string> {
  const required = new Set<string>();
  const queue = [...entryManifests];

  while (queue.length > 0) {
    const relPath = queue.shift();
    if (!relPath || required.has(relPath)) continue;
    required.add(relPath);

    const manifest = readJson<PackageManifest>(join(repoRoot, relPath));
    for (const depName of workspaceDeps(manifest)) {
      const depDir = nameToDir.get(depName);
      if (!depDir) {
        throw new Error(
          `Unknown workspace package "${depName}" referenced from ${relPath}. ` +
            `Ensure packages/*/package.json or apps/*/package.json defines "name".`,
        );
      }
      const depManifest = `${depDir}/package.json`;
      if (!required.has(depManifest)) {
        queue.push(depManifest);
      }
    }
  }

  return required;
}

function dirFromManifest(relPath: string): string {
  return dirname(relPath);
}

function parseDockerfileCopiedDirs(dockerfilePath: string): Set<string> {
  const content = readFileSync(join(repoRoot, dockerfilePath), "utf8");
  const copied = new Set<string>();

  for (const match of content.matchAll(/COPY\s+packages\/([^/\s]+)\/package\.json/gi)) {
    copied.add(`packages/${match[1]}`);
  }

  for (const match of content.matchAll(/COPY\s+packages\/([^/\s]+)\//gi)) {
    copied.add(`packages/${match[1]}`);
  }

  for (const match of content.matchAll(/COPY\s+apps\/([^/\s]+)\/package\.json/gi)) {
    copied.add(`apps/${match[1]}`);
  }

  return copied;
}

function validateTarget(target: DockerTarget, nameToDir: Map<string, string>): string[] {
  const errors: string[] = [];
  const closure = workspaceClosure(target.entryManifests, nameToDir);
  const copied = parseDockerfileCopiedDirs(target.dockerfile);

  const requiredDirs = new Set<string>();
  for (const manifest of closure) {
    requiredDirs.add(dirFromManifest(manifest));
  }

  const missing: string[] = [];
  for (const dir of requiredDirs) {
    if (dir === ".") continue;
    if (!copied.has(dir)) {
      missing.push(dir);
    }
  }

  if (missing.length > 0) {
    missing.sort();
    errors.push(
      `[${target.id}] ${target.dockerfile} is missing COPY for workspace packages needed at install time:`,
      ...missing.map((dir) => {
        if (dir.startsWith("packages/")) {
          return `  - COPY ${dir}/package.json ./${dir}/`;
        }
        return `  - COPY ${dir}/package.json ./${dir}/`;
      }),
      `  Root package.json workspace:* devDependencies affect both dev images because root package.json is always copied.`,
      `  Run: pnpm check:docker-workspace`,
    );
  }

  const extra: string[] = [];
  for (const dir of copied) {
    if (!requiredDirs.has(dir)) {
      extra.push(dir);
    }
  }

  if (extra.length > 0) {
    console.warn(
      `[${target.id}] ${target.dockerfile} COPY lists packages not in workspace closure (optional cleanup):`,
      ...extra.sort().map((dir) => `  - ${dir}`),
    );
  }

  return errors;
}

function main(): void {
  const nameToDir = buildNameToDirMap();
  const allErrors: string[] = [];

  for (const target of TARGETS) {
    allErrors.push(...validateTarget(target, nameToDir));
  }

  if (allErrors.length > 0) {
    console.error(allErrors.join("\n"));
    process.exit(1);
  }

  console.log("Docker workspace check passed (web + api Dockerfile.dev).");
}

main();
