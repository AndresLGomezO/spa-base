/**
 * Expand narrative callAi results that return charts as a sibling array into
 * markdown fenced blocks the Summary UI already understands.
 *
 * Model schema (compact — avoids nesting chart JSON inside the text string):
 * {
 *   "text": "… {{chart:0}} …",
 *   "charts": [{ "id": 0, "kind": "progress", "percent": 62, ... }]
 * }
 */

const CHART_KINDS = new Set([
  "progress",
  "pie",
  "bar",
  "sparkline",
  "chart-progress",
  "chart-pie",
  "chart-bar",
  "chart-sparkline",
]);

function resolveChartLanguage(kind: string): string | null {
  const trimmed = kind.trim().toLowerCase();
  if (!CHART_KINDS.has(trimmed)) {
    return null;
  }
  return trimmed.startsWith("chart-") ? trimmed : `chart-${trimmed}`;
}

function buildChartFence(entry: Record<string, unknown>): string | null {
  const kindRaw = entry.kind;
  if (typeof kindRaw !== "string") {
    return null;
  }
  const language = resolveChartLanguage(kindRaw);
  if (!language) {
    return null;
  }

  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entry)) {
    if (key === "kind" || key === "id") {
      continue;
    }
    payload[key] = value;
  }

  // Require at least one chart-specific field so empty objects are dropped.
  if (Object.keys(payload).length === 0) {
    return null;
  }

  // Blank lines around the fence so CommonMark treats it as a block even when
  // the model placed `{{chart:N}}` mid-paragraph.
  return `\n\n\`\`\`${language}\n${JSON.stringify(payload)}\n\`\`\`\n\n`;
}

/**
 * If `charts` is present, replace `{{chart:N}}` placeholders in `text` with
 * fenced blocks and drop `charts` from the returned object. If there is no
 * `charts` array, return the result unchanged (legacy fenced-in-text responses).
 */
export function expandNarrativeCharts(
  result: Record<string, unknown>,
): Record<string, unknown> {
  const text = result.text;
  const charts = result.charts;
  if (typeof text !== "string") {
    return result;
  }
  if (!Array.isArray(charts) || charts.length === 0) {
    return result;
  }

  let expanded = text;
  charts.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return;
    }
    const row = entry as Record<string, unknown>;
    const fence = buildChartFence(row);
    if (!fence) {
      return;
    }
    const id =
      typeof row.id === "number" && Number.isFinite(row.id)
        ? Math.trunc(row.id)
        : typeof row.id === "string" && /^\d+$/.test(row.id.trim())
          ? Number(row.id.trim())
          : index;
    expanded = expanded.replace(
      new RegExp(`\\s*\\{\\{chart:${id}\\}\\}\\s*`, "g"),
      fence,
    );
  });

  // Drop unresolved placeholders rather than leaving them visible.
  expanded = expanded.replace(/\s*\{\{chart:\d+\}\}\s*/g, "\n\n");
  expanded = expanded.replace(/\n{3,}/g, "\n\n").trim();

  const { charts: _ignoredCharts, ...rest } = result;
  void _ignoredCharts;
  return { ...rest, text: expanded };
}
