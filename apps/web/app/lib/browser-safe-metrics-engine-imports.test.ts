import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const WEB_APP_ROOT = process.cwd();
const METRICS_ENGINE_IMPORT_PATTERN =
  /from\s+["']@repo\/metrics-engine(\/[^"']+)?["']/g;

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

function findForbiddenMetricsEngineImports(source: string): string[] {
  const forbidden: string[] = [];
  for (const match of source.matchAll(METRICS_ENGINE_IMPORT_PATTERN)) {
    const subpath = match[1];
    if (subpath === "/browser") {
      continue;
    }
    forbidden.push(match[0]);
  }
  return forbidden;
}

describe("browser-safe metrics-engine imports", () => {
  it("imports @repo/metrics-engine only via the /browser entrypoint", () => {
    const offenders: string[] = [];

    for (const filePath of collectSourceFiles(join(WEB_APP_ROOT, "app"))) {
      const source = readFileSync(filePath, "utf8");
      const forbiddenImports = findForbiddenMetricsEngineImports(source);
      for (const forbiddenImport of forbiddenImports) {
        offenders.push(
          `${relative(WEB_APP_ROOT, filePath)}: ${forbiddenImport}`,
        );
      }
    }

    expect(offenders).toEqual([]);
  });
});
