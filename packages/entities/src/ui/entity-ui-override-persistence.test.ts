import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  fromPersistedUiOverride,
  toPersistedUiOverride,
} from "./entity-ui-override-persistence.js";
import {
  parseEntityUiOverrideRecord,
  putEntityUiOverrideInputSchema,
} from "./entity-ui-override-schema.js";

function measureDepth(value: unknown, depth = 0): number {
  if (value === null || typeof value !== "object") {
    return depth;
  }
  if (Array.isArray(value)) {
    return Math.max(
      depth,
      ...value.map((item) => measureDepth(item, depth + 1)),
    );
  }
  return Math.max(
    depth,
    ...Object.values(value).map((child) => measureDepth(child, depth + 1)),
  );
}

describe("entity UI override persistence", () => {
  it("round-trips a minimal override record", () => {
    const record = parseEntityUiOverrideRecord("contract", {
      views: [{ type: "table", name: "default", fields: ["name"] }],
      updatedAt: "2026-06-05T12:00:00.000Z",
    });

    const persisted = toPersistedUiOverride(record);
    const restored = fromPersistedUiOverride(persisted);

    expect(restored).toEqual(record);
    expect(persisted.viewsJson).toContain('"type":"table"');
    expect(measureDepth(persisted)).toBeLessThanOrEqual(10);
  });

  it("round-trips the contract wizard payload with shallow persisted depth", () => {
    const wizardPath = path.resolve(
      import.meta.dirname,
      "../../../../data/emulator/tenants/rates/entity_ui_overrides/Wizard Contract Form.json",
    );
    const payload = JSON.parse(fs.readFileSync(wizardPath, "utf8"));
    const parsedInput = putEntityUiOverrideInputSchema.parse(payload);
    const record = parseEntityUiOverrideRecord("contract", {
      ...parsedInput,
      updatedAt: "2026-06-05T12:00:00.000Z",
    });

    const persisted = toPersistedUiOverride(record);
    const restored = fromPersistedUiOverride(persisted);
    const persistedBytes = Buffer.byteLength(JSON.stringify(persisted), "utf8");

    expect(restored).toEqual(record);
    expect(measureDepth(persisted)).toBeLessThanOrEqual(10);
    expect(persistedBytes).toBeLessThan(1_000_000);
    expect(persisted.formsJson).toBeTruthy();
    expect(persisted.viewsJson).toBeTruthy();
  });
});
