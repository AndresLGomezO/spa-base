import { describe, expect, it } from "vitest";

import { assembleDataModelContext } from "./assemble-data-model-context.js";
import {
  buildAllModelFragments,
  MODEL_ENTITY_SCHEMA_ATOM_ID,
  MODEL_EXAMPLE_FULL_ATOM_ID,
  MODEL_FIELD_TYPES_ATOM_ID,
  MODEL_RELATIONS_ATOM_ID,
} from "../generate/model-schema.js";

describe("buildAllModelFragments", () => {
  it("includes all core model schema fragments", () => {
    const fragments = buildAllModelFragments();
    expect(fragments[MODEL_FIELD_TYPES_ATOM_ID]).toContain("string");
    expect(fragments[MODEL_FIELD_TYPES_ATOM_ID]).toContain("relation");
    expect(fragments[MODEL_ENTITY_SCHEMA_ATOM_ID]).toContain("description");
    expect(fragments[MODEL_RELATIONS_ATOM_ID]).toContain("many-to-many");
    expect(fragments[MODEL_EXAMPLE_FULL_ATOM_ID]).toContain("demoItem");
    expect(fragments[MODEL_EXAMPLE_FULL_ATOM_ID]).toContain("sensitive");
  });
});

describe("assembleDataModelContext", () => {
  it("assembles model fragments with user prompt", () => {
    const assembled = assembleDataModelContext({
      userPrompt: "Add a currency enum field",
    });
    expect(assembled.contextBlocks.length).toBeGreaterThanOrEqual(7);
    expect(assembled.contextBlocks.at(-1)?.id).toBe("user.prompt");
    expect(assembled.systemInstruction).toContain("data-model");
  });
});
