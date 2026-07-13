import { describe, expect, it } from "vitest";

import {
  formatDateDisplayValue,
  formatDaysRemainingDisplayValue,
  formatDisplayValue,
  formatNumberDisplayValue,
  isCurrencyField,
} from "./format-display-value";

describe("formatNumberDisplayValue", () => {
  it("formats integers without decimals in en-US", () => {
    expect(formatNumberDisplayValue(1000000, { locale: "en-US" })).toBe(
      "1,000,000",
    );
  });

  it("formats decimals with two fraction digits", () => {
    expect(formatNumberDisplayValue(1000000.01, { locale: "en-US" })).toBe(
      "1,000,000.01",
    );
  });

  it("formats with European grouping in de-DE", () => {
    expect(formatNumberDisplayValue(1000000.01, { locale: "de-DE" })).toBe(
      "1.000.000,01",
    );
  });
});

describe("formatDisplayValue", () => {
  it("prefixes currency numbers only when displayFormat is currency", () => {
    expect(
      formatDisplayValue(1200, {
        fieldType: "number",
        displayFormat: "currency",
        locale: "en-US",
      }),
    ).toBe("$ 1,200");
  });

  it("formats currency without decimal places", () => {
    expect(
      formatDisplayValue(1200.75, {
        fieldType: "number",
        displayFormat: "currency",
        locale: "en-US",
      }),
    ).toBe("$ 1,201");
    expect(
      formatDisplayValue(1200.4, {
        fieldType: "number",
        displayFormat: "currency",
        locale: "en-US",
      }),
    ).toBe("$ 1,200");
  });

  it("formats percentage display values by multiplying stored decimal by 100", () => {
    expect(
      formatDisplayValue(0.1, {
        fieldType: "number",
        displayFormat: "percentage",
        locale: "en-US",
      }),
    ).toBe("10%");
  });

  it("does not treat totalPeriods as currency without metadata", () => {
    expect(
      formatDisplayValue(10, {
        fieldType: "number",
        fieldName: "totalPeriods",
        locale: "en-US",
      }),
    ).toBe("10");
  });

  it("returns em dash for empty values", () => {
    expect(formatDisplayValue(null)).toBe("—");
  });

  it("formats date-only values", () => {
    const formatted = formatDisplayValue("2024-06-01T15:45:00.000Z", {
      fieldType: "date",
      dateDisplayFormat: "date",
      locale: "en-US",
      timeZone: "UTC",
    });
    expect(formatted).toMatch(/2024/);
    expect(formatted).not.toContain("PM");
  });

  it("formats time-only values", () => {
    const formatted = formatDisplayValue("2024-06-01T15:45:00.000Z", {
      fieldType: "date",
      dateDisplayFormat: "time",
      locale: "en-US",
      timeZone: "UTC",
    });
    expect(formatted).toContain("PM");
    expect(formatted).not.toMatch(/2024/);
  });

  it("does not format plain text with numbers as dates", () => {
    expect(
      formatDisplayValue("test 1", {
        fieldType: "string",
        locale: "en-US",
      }),
    ).toBe("test 1");
  });

  it("does not format loose date-like text on date fields", () => {
    expect(
      formatDisplayValue("test 1", {
        fieldType: "date",
        locale: "en-US",
      }),
    ).toBe("test 1");
  });

  it("does not infer dates from ISO-shaped strings on non-date fields", () => {
    expect(
      formatDisplayValue("2024-06-01T15:45:00.000Z", {
        fieldType: "string",
        locale: "en-US",
        timeZone: "UTC",
      }),
    ).toBe("2024-06-01T15:45:00.000Z");
  });
});

describe("isCurrencyField", () => {
  it("detects currency by display format only", () => {
    expect(isCurrencyField("number", "qty", "currency")).toBe(true);
    expect(isCurrencyField("number", "unitPrice", undefined)).toBe(false);
    expect(isCurrencyField("number", "totalPeriods", undefined)).toBe(false);
  });
});

describe("formatDateDisplayValue", () => {
  it("formats ISO dates with timezone suffix by default", () => {
    const formatted = formatDateDisplayValue("2024-06-01T15:45:00.000Z", {
      locale: "en-US",
      timeZone: "UTC",
    });
    expect(formatted).toContain("2024");
    expect(formatted).toContain("PM");
  });

  it("formats days remaining from a due date", () => {
    const reference = new Date("2024-06-01T12:00:00.000Z");
    expect(
      formatDaysRemainingDisplayValue("2024-06-03T00:00:00.000Z", {
        locale: "en-US",
        timeZone: "UTC",
        referenceDate: reference,
      }),
    ).toBe("2 days left");
    expect(
      formatDaysRemainingDisplayValue("2024-06-01T00:00:00.000Z", {
        locale: "en-US",
        timeZone: "UTC",
        referenceDate: reference,
      }),
    ).toBe("Due today");
  });
});
