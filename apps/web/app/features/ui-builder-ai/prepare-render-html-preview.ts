/** Sandbox: same-origin for hash nav inside blob preview; scripts stay blocked. */
export const RENDER_HTML_PREVIEW_SANDBOX = "allow-same-origin";

/**
 * Harden stored model HTML before loading in an iframe preview.
 * srcDoc/iframes inherit the parent URL as base — strip risky tags and layout-breaking links.
 */
export function prepareRenderHtmlPreview(html: string): string {
  let prepared = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/<base\b[^>]*>/gi, "")
    .replace(
      /<link\b[^>]*\brel=["'](?:modulepreload|preload|import)[^"']*["'][^>]*>/gi,
      "",
    )
    .replace(/<link\b[^>]*\bhref=["']\/[^"']*["'][^>]*>/gi, "")
    .replace(/<link\b[^>]*\brel=["']manifest["'][^>]*>/gi, "");

  const headInjections =
    "<style>" +
    "html,body{overflow:auto;height:auto;min-height:100%}" +
    ".wizard-nav a.active{font-weight:600;color:#fff;background:rgba(255,255,255,.06)}" +
    "</style>";
  if (prepared.includes("</head>")) {
    prepared = prepared.replace("</head>", `${headInjections}</head>`);
  } else if (prepared.includes("<head>")) {
    prepared = prepared.replace("<head>", `<head>${headInjections}`);
  } else if (prepared.includes("<html")) {
    prepared = prepared.replace(
      /<html([^>]*)>/i,
      `<html$1><head>${headInjections}</head>`,
    );
  }

  return prepared.trim();
}
