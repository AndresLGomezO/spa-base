import { describe, expect, it } from "vitest";

import {
  matchConditionalDaysRemainingStyles,
  matchConditionalStylesForDate,
} from "./match-conditional-styles.js";

const referenceDate = new Date("2024-06-01T12:00:00.000Z");

describe("matchConditionalDaysRemainingStyles", () => {
  it("applies danger when fewer than 2 days remain", () => {
    const matched = matchConditionalDaysRemainingStyles(
      "2024-06-01T00:00:00.000Z",
      [
        { matchValue: "<2", textColor: "danger" },
        { matchValue: "<5", textColor: "warning" },
        { matchValue: ">=5", textColor: "success" },
      ],
      { referenceDate, timeZone: "UTC" },
    );

    expect(matched.className).toBe("text-destructive");
  });

  it("applies warning when 2 to 4 days remain", () => {
    const matched = matchConditionalDaysRemainingStyles(
      "2024-06-04T00:00:00.000Z",
      [
        { matchValue: "<2", textColor: "danger" },
        { matchValue: "<5", textColor: "warning" },
        { matchValue: ">=5", textColor: "success" },
      ],
      { referenceDate, timeZone: "UTC" },
    );

    expect(matched.className).toBe("text-warning");
  });

  it("applies success when 5 or more days remain", () => {
    const matched = matchConditionalDaysRemainingStyles(
      "2024-06-06T00:00:00.000Z",
      [
        { matchValue: "<2", textColor: "danger" },
        { matchValue: "<5", textColor: "warning" },
        { matchValue: ">=5", textColor: "success" },
      ],
      { referenceDate, timeZone: "UTC" },
    );

    expect(matched.className).toBe("text-success");
  });

  it("treats overdue dates as danger when less than 2 days", () => {
    const matched = matchConditionalDaysRemainingStyles(
      "2024-05-30T00:00:00.000Z",
      [
        { matchValue: "<2", textColor: "danger" },
        { matchValue: "<5", textColor: "warning" },
        { matchValue: ">=5", textColor: "success" },
      ],
      { referenceDate, timeZone: "UTC" },
    );

    expect(matched.className).toBe("text-destructive");
  });
});

describe("matchConditionalStylesForDate", () => {
  it("uses threshold rules for daysRemaining display format", () => {
    const matched = matchConditionalStylesForDate(
      "2024-06-03T00:00:00.000Z",
      [
        { matchValue: "<2", textColor: "danger" },
        { matchValue: "<5", textColor: "warning" },
        { matchValue: ">=5", textColor: "success" },
      ],
      {
        dateDisplayFormat: "daysRemaining",
        referenceDate,
        timeZone: "UTC",
      },
    );

    expect(matched.className).toBe("text-warning");
  });

  it("falls back to exact match for other date display formats", () => {
    const matched = matchConditionalStylesForDate(
      "2024-06-03T00:00:00.000Z",
      [{ matchValue: "2024-06-03T00:00:00.000Z", textColor: "primary" }],
      { dateDisplayFormat: "date", referenceDate, timeZone: "UTC" },
    );

    expect(matched.className).toBe("text-primary");
  });
});
