import { useMemo } from "react";
import type { ExpressionNode } from "@repo/hooks";
import { Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { formatExpressionDsl } from "./format-expression-dsl-preview";

interface FormulaExpressionPreviewProps {
  readonly value: ExpressionNode;
  readonly showTitle?: boolean;
}

export function FormulaExpressionPreview({
  value,
  showTitle = true,
}: FormulaExpressionPreviewProps) {
  const { t } = useTranslation("common");
  const dslText = useMemo(() => formatExpressionDsl(value), [value]);
  const isSingleLine = !dslText.includes("\n");

  return (
    <div className="space-y-2">
      {showTitle ? (
        <Text className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {t("formulas.preview.title")}
        </Text>
      ) : null}
      <pre
        className={`bg-muted max-h-64 overflow-auto rounded-md p-3 font-mono text-xs ${isSingleLine ? "whitespace-pre" : "whitespace-pre-wrap"}`}
      >
        {dslText}
      </pre>
    </div>
  );
}
