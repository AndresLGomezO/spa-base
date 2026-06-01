import { describe, expect, it } from "vitest";

import { formatRecordDisplayLabel } from "./format-record-display-label";

describe("formatRecordDisplayLabel", () => {
  it("uses code in auto fallback when name, title, and label are empty", () => {
    expect(
      formatRecordDisplayLabel({
        id: "rec_1",
        code: "SKU-42",
      }),
    ).toBe("SKU-42");
  });

  it("prefers explicit displayField over auto fallback", () => {
    expect(
      formatRecordDisplayLabel(
        { id: "rec_1", code: "SKU-42", title: "Widget" },
        "title",
      ),
    ).toBe("Widget");
  });
});
