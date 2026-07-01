import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ExpressionNode } from "@repo/hooks";
import { evaluateExpression, ExpressionEvaluationError } from "@repo/hooks";
import { Text } from "@repo/ui";

import {
  EXPRESSION_PREVIEW_MOCK_SCOPE,
  resolveEditorKind,
} from "./expression-editor-utils";

interface ExpressionPreviewProps {
  readonly value: ExpressionNode;
}

function formatPreviewValue(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function ExpressionPreview({ value }: ExpressionPreviewProps) {
  const { t } = useTranslation("common");
  const kind = resolveEditorKind(value);

  const preview = useMemo(() => {
    if (kind === "advanced") {
      return { error: t("dataHooks.expression.previewUnavailable") };
    }
    try {
      const result = evaluateExpression(value, EXPRESSION_PREVIEW_MOCK_SCOPE);
      return { result: formatPreviewValue(result) };
    } catch (error) {
      const message =
        error instanceof ExpressionEvaluationError
          ? error.message
          : t("dataHooks.expression.previewError");
      return { error: message };
    }
  }, [kind, t, value]);

  return (
    <div className="space-y-1">
      <Text className="text-muted-foreground text-xs font-medium">
        {t("dataHooks.expression.preview")}
      </Text>
      {"error" in preview ? (
        <Text className="text-muted-foreground text-xs">{preview.error}</Text>
      ) : (
        <Text className="font-mono text-xs">{preview.result}</Text>
      )}
    </div>
  );
}
