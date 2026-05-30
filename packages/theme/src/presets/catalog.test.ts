import { describe, expect, it } from "vitest";

import { appearanceToCssVariables } from "../tenant-overrides.js";
import {
  APPEARANCE_PRESET_CATALOG,
  NAMED_APPEARANCE_PRESETS,
} from "./catalog.js";

describe("APPEARANCE_PRESET_CATALOG", () => {
  it("defines every named preset with matching preset id", () => {
    for (const id of NAMED_APPEARANCE_PRESETS) {
      expect(APPEARANCE_PRESET_CATALOG[id].preset).toBe(id);
    }
  });

  it("expands each preset to primary and neutral scale variables", () => {
    for (const id of NAMED_APPEARANCE_PRESETS) {
      const vars = appearanceToCssVariables({ preset: id });
      expect(vars["--color-primary-500"]).toMatch(/^#[0-9a-f]{6}$/);
      expect(vars["--color-neutral-50"]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("inlines light semantics derived from frutigerAero palette scales", () => {
    const vars = appearanceToCssVariables({ preset: "frutigerAero" });
    expect(vars["--color-background"]).toBe(vars["--color-neutral-50"]);
    expect(vars["--color-foreground"]).toBe(vars["--color-neutral-950"]);
    expect(vars["--color-primary-500"]).toBe("#00a6d6");
    expect(vars["--color-neutral-100"]).toBe("#e0f4ff");
  });
});
