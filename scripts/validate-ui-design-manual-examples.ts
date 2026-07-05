/**
 * Validates JSON code fences in docs/ui-design-manual/ against layout schemas.
 *
 * Usage:
 *   pnpm validate:ui-design-manual
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { parseDesignLayoutSliceJson } from "@repo/entities";
import type { DesignLayoutSurface } from "@repo/entities";
import { uiLayoutDocumentSchema } from "@repo/ui-builder-core";

const repoRoot = join(fileURLToPath(import.meta.url), "..", "..");
const manualDir = join(repoRoot, "docs/ui-design-manual");

const JSON_FENCE_RE = /```json\s*\n([\s\S]*?)```/g;

function collectMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...collectMarkdownFiles(path));
    } else if (entry.endsWith(".md")) {
      files.push(path);
    }
  }
  return files;
}

function validateJsonBlock(
  jsonText: string,
  filePath: string,
  blockIndex: number,
): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return [];
  }

  if (typeof parsed !== "object" || parsed === null) {
    return [];
  }

  const record = parsed as Record<string, unknown>;

  if (record.kind === "design-layout-slice") {
    const surface = record.surface;
    if (typeof surface !== "string" || surface.includes("<")) {
      return [];
    }
    const result = parseDesignLayoutSliceJson(
      jsonText,
      surface as DesignLayoutSurface,
    );
    if (!result.ok) {
      return result.errors.map(
        (error) =>
          `${relative(repoRoot, filePath)} block ${blockIndex} envelope ${error.path}: ${error.message}`,
      );
    }
    return [];
  }

  if ("root" in record) {
    const result = uiLayoutDocumentSchema.safeParse(parsed);
    if (!result.success) {
      return result.error.issues.map(
        (issue) =>
          `${relative(repoRoot, filePath)} block ${blockIndex} layout ${issue.path.join(".")}: ${issue.message}`,
      );
    }
    return [];
  }

  return [];
}

function main(): void {
  const files = collectMarkdownFiles(manualDir);
  const errors: string[] = [];

  for (const filePath of files) {
    const content = readFileSync(filePath, "utf8");
    let match: RegExpExecArray | null;
    let blockIndex = 0;
    JSON_FENCE_RE.lastIndex = 0;

    while ((match = JSON_FENCE_RE.exec(content)) !== null) {
      blockIndex += 1;
      const jsonText = match[1]?.trim() ?? "";
      if (!jsonText) {
        continue;
      }
      errors.push(...validateJsonBlock(jsonText, filePath, blockIndex));
    }
  }

  if (errors.length > 0) {
    console.error(`UI design manual validation failed (${errors.length} issues):\n`);
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `Validated JSON fences in ${files.length} manual files — no layout/envelope errors.`,
  );
}

main();
