/**
 * Enforces markdown placement after the docs cleanup:
 * - docs/ only under the known taxonomy (guides, reference, ai-platform, …)
 * - elsewhere only README.md (apps/packages/scripts), root README/AGENTS, .github, or explicit exceptions
 *
 * Usage:
 *   pnpm check:docs-layout
 */

import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Directory names skipped anywhere in the walk. */
const IGNORE_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".local",
  ".turbo",
  ".vite",
  ".next",
  "dist",
  "build",
  "coverage",
  ".pnpm-store",
  ".terraform",
  "playwright-report",
  "test-results",
]);

/** Path prefixes (posix, relative to repo root) skipped entirely. */
const IGNORE_PREFIXES = [
  "packages/ai-context/src/generated/",
  "packages/ui/playwright-report/",
  "packages/ui/test-results/",
  "packages/infrastructure/terraform/.terraform/",
];

/** Exact relative paths allowed outside the normal README / docs rules. */
const EXTRA_ALLOWLIST = new Set([
  "packages/entities/src/schema/Card Specs.md",
]);

function toPosix(p: string): string {
  return p.split(sep).join("/");
}

function shouldIgnoreDir(name: string): boolean {
  return IGNORE_DIR_NAMES.has(name);
}

function shouldIgnorePath(relPosix: string): boolean {
  if (IGNORE_PREFIXES.some((prefix) => relPosix.startsWith(prefix))) {
    return true;
  }
  // Visual snapshot markdown under packages/ui/tests/visual (keep README.md)
  if (
    relPosix.startsWith("packages/ui/tests/visual/") &&
    relPosix.endsWith(".md") &&
    !relPosix.endsWith("/README.md") &&
    relPosix !== "packages/ui/tests/visual/README.md"
  ) {
    return true;
  }
  return false;
}

function collectMarkdownFiles(dir: string, out: string[]): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".github") {
      // Skip hidden dirs/files at any level except we already entered .github from root walk
      if (entry.isDirectory() && shouldIgnoreDir(entry.name)) continue;
      if (entry.isDirectory() && entry.name !== ".github") continue;
      if (!entry.isDirectory() && !entry.name.endsWith(".md")) continue;
    }

    const full = join(dir, entry.name);
    const relPosix = toPosix(relative(repoRoot, full));

    if (entry.isDirectory()) {
      if (shouldIgnoreDir(entry.name)) continue;
      if (shouldIgnorePath(relPosix + "/")) continue;
      collectMarkdownFiles(full, out);
      continue;
    }

    if (!entry.name.endsWith(".md")) continue;
    if (shouldIgnorePath(relPosix)) continue;

    try {
      if (!statSync(full).isFile()) continue;
    } catch {
      continue;
    }
    out.push(relPosix);
  }
}

function isAllowed(relPosix: string): boolean {
  if (EXTRA_ALLOWLIST.has(relPosix)) return true;

  // Root
  if (relPosix === "README.md" || relPosix === "AGENTS.md") return true;

  // GitHub
  if (relPosix.startsWith(".github/") && relPosix.endsWith(".md")) return true;

  // docs taxonomy
  if (relPosix === "docs/README.md") return true;
  if (/^docs\/guides\/[^/]+\.md$/.test(relPosix)) return true;
  if (/^docs\/reference\/[^/]+\.md$/.test(relPosix)) return true;
  if (relPosix.startsWith("docs/ai-platform/") && relPosix.endsWith(".md")) {
    return true;
  }
  if (relPosix.startsWith("docs/infrastructure/") && relPosix.endsWith(".md")) {
    return true;
  }
  if (relPosix.startsWith("docs/ui-design-manual/") && relPosix.endsWith(".md")) {
    return true;
  }

  // README.md under apps/, packages/, scripts/
  if (
    (relPosix.startsWith("apps/") ||
      relPosix.startsWith("packages/") ||
      relPosix.startsWith("scripts/")) &&
    (relPosix.endsWith("/README.md") || relPosix === "apps/README.md")
  ) {
    return true;
  }

  return false;
}

function main(): void {
  const files: string[] = [];
  collectMarkdownFiles(repoRoot, files);
  files.sort();

  const offenders = files.filter((f) => !isAllowed(f));

  if (offenders.length === 0) {
    console.log(
      `check-docs-layout: ok (${files.length} markdown file(s) within policy)`,
    );
    process.exit(0);
  }

  console.error("check-docs-layout: markdown files outside the docs path policy:\n");
  for (const f of offenders) {
    console.error(`  ${f}`);
  }
  console.error(`
Hint:
  - Platform docs belong under docs/guides/, docs/reference/, docs/ai-platform/,
    docs/infrastructure/, or docs/ui-design-manual/ (see docs/README.md).
  - Package/app docs should be named README.md under apps/, packages/, or scripts/.
  - One-off exceptions: add the path to EXTRA_ALLOWLIST in scripts/check-docs-layout.ts.
`);
  process.exit(1);
}

main();
