import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CardFieldDate } from "./CardFieldDate.js";

describe("CardFieldDate", () => {
  it("formats datetime values by default", () => {
    const html = renderToStaticMarkup(
      createElement(CardFieldDate, {
        value: "2024-06-01T15:45:00.000Z",
        locale: "en",
      }),
    );

    expect(html).toContain("2024-06-01");
    expect(html).toContain("45");
  });

  it("formats date-only values", () => {
    const html = renderToStaticMarkup(
      createElement(CardFieldDate, {
        value: "2024-06-01T15:45:00.000Z",
        dateDisplayFormat: "date",
        locale: "en",
      }),
    );

    expect(html).toContain("06/01/2024");
  });

  it("formats time-only values", () => {
    const html = renderToStaticMarkup(
      createElement(CardFieldDate, {
        value: "2024-06-01T15:45:00.000Z",
        dateDisplayFormat: "time",
        locale: "en",
      }),
    );

    expect(html).toMatch(/3:45|15:45/);
  });

  it("renders an em dash for empty values", () => {
    const html = renderToStaticMarkup(
      createElement(CardFieldDate, { value: null }),
    );

    expect(html).toContain("—");
  });

  it("applies theme token color classes on the value", () => {
    const html = renderToStaticMarkup(
      createElement(CardFieldDate, {
        value: "2024-06-01T15:45:00.000Z",
        valueClassName: "text-success",
      }),
    );

    expect(html).toContain('class="');
    expect(html).toContain("text-success");
    expect(html).not.toMatch(/text-foreground[^"]*text-success/);
  });

  it("applies custom color inline styles on the value", () => {
    const html = renderToStaticMarkup(
      createElement(CardFieldDate, {
        value: "2024-06-01T15:45:00.000Z",
        valueStyle: { color: "var(--color-primary)" },
      }),
    );

    expect(html).toContain('style="color:var(--color-primary)"');
  });
});
