import { describe, expect, it } from "vitest";

import {
  fromPersistedUiBuilderPreset,
  toPersistedUiBuilderPreset,
} from "./ui-builder-preset-persistence.js";
import { uiBuilderPresetRecordSchema } from "./ui-builder-preset-schema.js";

describe("UI builder preset persistence", () => {
  it("round-trips a component-row preset record", () => {
    const record = uiBuilderPresetRecordSchema.parse({
      id: "preset_abc123",
      name: "Title row",
      kind: "component-row",
      designSurface: "listItem",
      sourceEntityName: "contract",
      templateJson: JSON.stringify({
        type: "component",
        id: "row-1",
        component: {
          kind: "text",
          primary: { type: "field", path: "$slot:slot-1" },
        },
      }),
      fieldSlots: [
        {
          id: "slot-1",
          kind: "dataSourceField",
          jsonPath: "row.component.primary.path",
          sourceHint: "name",
        },
      ],
      updatedAt: "2026-06-05T12:00:00.000Z",
    });

    const persisted = toPersistedUiBuilderPreset(record);
    const restored = fromPersistedUiBuilderPreset(record.id, persisted);

    expect(restored).toEqual(record);
    expect(persisted.fieldSlotsJson).toContain("slot-1");
  });
});
