import type { MetricDerivedExpressionToken } from "@repo/ui-builder-core";

const OPERATOR_SYMBOLS: Readonly<
  Record<
    Extract<MetricDerivedExpressionToken, { type: "operator" }>["op"],
    string
  >
> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};

export function formatMetricDerivedExpressionPreview(
  expression: readonly MetricDerivedExpressionToken[],
  resolveMetricLabel: (metricDefinitionId: string) => string,
): string {
  return expression
    .map((token) => {
      switch (token.type) {
        case "metric": {
          const label = token.metricDefinitionId.trim();
          return label.length > 0
            ? resolveMetricLabel(token.metricDefinitionId)
            : "?";
        }
        case "constant":
          return String(token.value);
        case "operator":
          return ` ${OPERATOR_SYMBOLS[token.op]} `;
        case "paren":
          return token.side === "open" ? "(" : ")";
      }
    })
    .join("")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}
