import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const WEB_APP_ROOT = process.cwd();
const AI_CONTEXT_IMPORT_PATTERN =
  /from\s+["']@repo\/ai-context(\/[^"']+)?["']/g;

const ALLOWED_SUBPATHS = new Set([
  "/storage",
  "/permissions",
  "/grounded-chat-record-ref",
]);

function collectSourceFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(absolutePath));
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts")) {
      files.push(absolutePath);
    }
  }

  return files;
}

function findForbiddenAiContextImports(source: string): string[] {
  const forbidden: string[] = [];
  for (const match of source.matchAll(AI_CONTEXT_IMPORT_PATTERN)) {
    const subpath = match[1];
    if (subpath && ALLOWED_SUBPATHS.has(subpath)) {
      continue;
    }
    // Bare @repo/ai-context pulls node:fs via generated/load-generated.
    forbidden.push(match[0]);
  }
  return forbidden;
}

describe("browser-safe ai-context imports", () => {
  it("imports @repo/ai-context only via browser-safe subpaths", () => {
    const offenders: string[] = [];

    for (const filePath of collectSourceFiles(join(WEB_APP_ROOT, "app"))) {
      const source = readFileSync(filePath, "utf8");
      const forbiddenImports = findForbiddenAiContextImports(source);
      for (const forbiddenImport of forbiddenImports) {
        offenders.push(
          `${relative(WEB_APP_ROOT, filePath)}: ${forbiddenImport}`,
        );
      }
    }

    expect(offenders).toEqual([]);
  });
});
