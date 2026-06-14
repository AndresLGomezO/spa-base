/** Strip script tags and event handlers before persisting/displaying model HTML. */
export function sanitizeFormsRenderHtml(html: string): string {
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/<base\b[^>]*>/gi, "")
    .replace(
      /<link\b[^>]*\brel=["'](?:modulepreload|preload|import)[^"']*["'][^>]*>/gi,
      "",
    )
    .replace(/<link\b[^>]*\bhref=["']\/[^"']*["'][^>]*>/gi, "");

  if (!sanitized.includes("<!DOCTYPE") && !sanitized.includes("<html")) {
    sanitized = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Form preview</title></head><body>${sanitized}</body></html>`;
  }

  if (!sanitized.includes('target="_self"')) {
    if (sanitized.includes("</head>")) {
      sanitized = sanitized.replace("</head>", '<base target="_self"></head>');
    } else if (sanitized.includes("<head>")) {
      sanitized = sanitized.replace("<head>", '<head><base target="_self">');
    }
  }

  return sanitized.trim();
}
