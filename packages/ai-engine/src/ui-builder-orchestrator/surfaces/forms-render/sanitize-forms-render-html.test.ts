import { describe, expect, it } from "vitest";

import { sanitizeFormsRenderHtml } from "./sanitize-forms-render-html.js";

describe("sanitizeFormsRenderHtml", () => {
  it("strips script tags and inline event handlers", () => {
    const sanitized = sanitizeFormsRenderHtml(
      '<div onclick="alert(1)"><script>alert(1)</script>Hello</div>',
    );
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).toContain("Hello");
  });

  it("wraps HTML fragments in a full document", () => {
    const sanitized = sanitizeFormsRenderHtml("<p>Preview</p>");
    expect(sanitized).toContain("<!DOCTYPE html>");
    expect(sanitized).toContain('<meta name="viewport"');
    expect(sanitized).toContain("<p>Preview</p>");
  });

  it("preserves complete HTML documents and adds base target=_self", () => {
    const doc =
      "<!DOCTYPE html><html><head><title>T</title></head><body><form></form></body></html>";
    expect(sanitizeFormsRenderHtml(doc)).toContain('<base target="_self">');
  });
});
