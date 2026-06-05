import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  deserializeDeepValuesFromFirestore,
  FIRESTORE_MAX_DOCUMENT_DEPTH,
  serializeDeepValuesForFirestore,
} from "./firestore-layout-serialization.js";

function buildNestedObject(targetDepth: number): Record<string, unknown> {
  let current: Record<string, unknown> = { value: "leaf" };
  for (let depth = 1; depth < targetDepth; depth += 1) {
    current = { child: current };
  }
  return current;
}

function measureDepth(value: unknown, depth = 0): number {
  if (value === null || typeof value !== "object") {
    return depth;
  }
  if (Array.isArray(value)) {
    return Math.max(depth, ...value.map((item) => measureDepth(item, depth + 1)));
  }
  return Math.max(
    depth,
    ...Object.values(value).map((child) => measureDepth(child, depth + 1)),
  );
}

describe("firestore layout serialization", () => {
  it("leaves shallow documents unchanged", () => {
    const input = { views: [{ type: "table", name: "default", fields: ["name"] }] };
    const serialized = serializeDeepValuesForFirestore(input);
    expect(serialized).toEqual(input);
  });

  it("keeps serialized documents within Firestore depth", () => {
    const deep = buildNestedObject(FIRESTORE_MAX_DOCUMENT_DEPTH + 2);
    const input = { forms: { wizard: { shellLayout: deep, steps: [] } } };
    const serialized = serializeDeepValuesForFirestore(input);

    expect(measureDepth(serialized)).toBeLessThanOrEqual(
      FIRESTORE_MAX_DOCUMENT_DEPTH,
    );
    expect(deserializeDeepValuesFromFirestore(serialized)).toEqual(input);
  });

  it("round-trips the contract wizard payload", () => {
    const curlPath = path.resolve(
      import.meta.dirname,
      "../../../../data/emulator/tenants/rates/CURL with error.js",
    );
    const curl = fs.readFileSync(curlPath, "utf8");
    const marker = "--data-raw '";
    const payload = JSON.parse(
      curl.slice(curl.indexOf(marker) + marker.length, curl.lastIndexOf("'")),
    );

    const serialized = serializeDeepValuesForFirestore(payload);
    expect(measureDepth(serialized)).toBeLessThanOrEqual(
      FIRESTORE_MAX_DOCUMENT_DEPTH,
    );
    expect(deserializeDeepValuesFromFirestore(serialized)).toEqual(payload);
  });

  it("round-trips serialized subtrees", () => {
    const deep = buildNestedObject(FIRESTORE_MAX_DOCUMENT_DEPTH + 2);
    const input = { forms: { wizard: { shellLayout: deep, steps: [] } } };
    const restored = deserializeDeepValuesFromFirestore(
      serializeDeepValuesForFirestore(input),
    );
    expect(restored).toEqual(input);
  });
});
