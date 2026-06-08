import { describe, expect, it } from "vitest";

import type { EntityFieldSelectorComponentConfig } from "@repo/ui-builder-core";

import {
  filterSelectorOptions,
  mapEnumValuesToOptions,
  mapRelationRecordsToOptions,
  resolveSelectorImageFieldPath,
  toggleSelectorValue,
  type SelectorOption,
} from "./entity-field-selector-utils";

const options: readonly SelectorOption[] = [
  { id: "1", label: "Alpha Bank" },
  { id: "2", label: "Beta Services" },
];

describe("filterSelectorOptions", () => {
  it("filters options by label", () => {
    expect(filterSelectorOptions(options, "bank")).toEqual([options[0]]);
  });

  it("returns all options when query is empty", () => {
    expect(filterSelectorOptions(options, "")).toEqual(options);
  });
});

describe("resolveSelectorImageFieldPath", () => {
  it("prefers the configured image field path", () => {
    const config: EntityFieldSelectorComponentConfig = {
      kind: "entity-field-selector",
      fieldPath: "providerId",
      layout: "list-with-logo",
      imageFieldPath: "logo",
    };

    expect(
      resolveSelectorImageFieldPath(config, {
        name: "provider",
        collection: "providers",
        permissions: [],
        fields: {
          logo: { type: "image", required: false, optional: true },
        },
        ui: {
          views: [],
          forms: { create: { sections: [] }, edit: { sections: [] } },
        },
      }),
    ).toBe("logo");
  });

  it("falls back to the first image field on the target entity", () => {
    const config: EntityFieldSelectorComponentConfig = {
      kind: "entity-field-selector",
      fieldPath: "providerId",
      layout: "list-with-logo",
    };

    expect(
      resolveSelectorImageFieldPath(config, {
        name: "provider",
        collection: "providers",
        permissions: [],
        fields: {
          logo: { type: "image", required: false, optional: true },
        },
        ui: {
          views: [],
          forms: { create: { sections: [] }, edit: { sections: [] } },
        },
      }),
    ).toBe("logo");
  });
});

describe("mapRelationRecordsToOptions", () => {
  it("keeps the source record for image rendering", () => {
    const record = { id: "prov-1", name: "Acme Bank", logo: { fileName: "x" } };
    expect(mapRelationRecordsToOptions([record], undefined)).toEqual([
      {
        id: "prov-1",
        label: "Acme Bank",
        record,
      },
    ]);
  });
});

describe("toggleSelectorValue", () => {
  it("replaces selection for single-select fields", () => {
    expect(toggleSelectorValue("", "a", false)).toBe("a");
    expect(toggleSelectorValue("a", "a", false)).toBe("");
    expect(toggleSelectorValue("a", "b", false)).toBe("b");
  });

  it("toggles ids for multi-select fields", () => {
    expect(toggleSelectorValue(["a"], "b", true)).toEqual(["a", "b"]);
    expect(toggleSelectorValue(["a", "b"], "a", true)).toEqual(["b"]);
  });
});

describe("mapEnumValuesToOptions", () => {
  it("maps enum values to selector options", () => {
    expect(mapEnumValuesToOptions(["draft", "active"])).toEqual([
      { id: "draft", label: "draft" },
      { id: "active", label: "active" },
    ]);
  });
});
