import { describe, expect, it } from "vitest";

import { resolveLayoutRootColumns } from "../layout/layout-root-adapters.js";
import { createDefaultRecordDetailLayout } from "./defaults.js";

function collectKinds(
  layout: ReturnType<typeof createDefaultRecordDetailLayout>,
): string[] {
  const kinds: string[] = [];
  const walk = (rows: unknown) => {
    if (!Array.isArray(rows)) {
      return;
    }
    for (const row of rows) {
      if (!row || typeof row !== "object") {
        continue;
      }
      const component = (
        row as { component?: { kind?: string; rows?: unknown } }
      ).component;
      if (!component) {
        continue;
      }
      if (component.kind) {
        kinds.push(component.kind);
      }
      if (component.rows) {
        walk(component.rows);
      }
    }
  };
  for (const column of resolveLayoutRootColumns(layout)) {
    walk(column.rows);
  }
  return kinds;
}

function collectFieldPaths(
  layout: ReturnType<typeof createDefaultRecordDetailLayout>,
): string[] {
  const paths: string[] = [];
  const walk = (rows: unknown) => {
    if (!Array.isArray(rows)) {
      return;
    }
    for (const row of rows) {
      if (!row || typeof row !== "object") {
        continue;
      }
      const component = (
        row as {
          component?: {
            kind?: string;
            rows?: unknown;
            primary?: { type?: string; path?: string };
          };
        }
      ).component;
      if (!component) {
        continue;
      }
      if (component.primary?.type === "field" && component.primary.path) {
        paths.push(`${component.kind}:${component.primary.path}`);
      }
      if (component.rows) {
        walk(component.rows);
      }
    }
  };
  for (const column of resolveLayoutRootColumns(layout)) {
    walk(column.rows);
  }
  return paths;
}

describe("createDefaultRecordDetailLayout", () => {
  it("places image fields and includes document text slots", () => {
    const layout = createDefaultRecordDetailLayout({
      logo: { type: "image" },
      name: { type: "string" },
      email: { type: "string" },
      file: { type: "document" },
    });

    const paths = collectFieldPaths(layout);
    expect(paths).toContain("image:logo");
    expect(paths).toContain("text:name");
    expect(paths).toContain("text:file");
    expect(collectKinds(layout)).toContain("image");
  });

  it("falls back to text-only default when no media fields exist", () => {
    const layout = createDefaultRecordDetailLayout({
      name: { type: "string" },
      status: { type: "enum" },
    });
    const paths = collectFieldPaths(layout);
    expect(paths.some((path) => path.startsWith("image:"))).toBe(false);
    expect(paths).toContain("text:name");
  });
});
