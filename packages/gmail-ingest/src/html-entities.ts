/** Common HTML named entities seen in bank notification plain/HTML bodies. */
const NAMED_HTML_ENTITIES: Readonly<Record<string, string>> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  aacute: "á",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  ntilde: "ñ",
  uuml: "ü",
};

/**
 * Decode numeric and common named HTML entities so label/pattern extractors
 * can match accented Spanish bank email copy (e.g. `N&uacute;mero`).
 */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (match, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : match;
    })
    .replace(/&#(\d+);/g, (match, code: string) => {
      const n = Number.parseInt(code, 10);
      return Number.isFinite(n) ? String.fromCharCode(n) : match;
    })
    .replace(/&([a-zA-Z]+);/g, (match, name: string) => {
      return NAMED_HTML_ENTITIES[name.toLowerCase()] ?? match;
    });
}
