import type { ReactNode } from "react";
import { Alert, Text } from "@repo/ui";

/**
 * Shared loading / error / empty framing for AI insight sections.
 */
export function InsightsSectionShell({
  isLoading,
  isError,
  isEmpty,
  loadingLabel,
  errorMessage,
  emptyMessage,
  emptyTestId,
  summary,
  children,
}: {
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly isEmpty: boolean;
  readonly loadingLabel: string;
  readonly errorMessage: string;
  readonly emptyMessage: string;
  readonly emptyTestId: string;
  readonly summary?: ReactNode;
  readonly children?: ReactNode;
}) {
  return (
    <>
      {isLoading ? (
        <Text className="text-muted-foreground text-sm">{loadingLabel}</Text>
      ) : null}

      {isError ? <Alert>{errorMessage}</Alert> : null}

      {summary}

      {!isLoading && isEmpty ? (
        <Text
          className="text-muted-foreground text-sm"
          data-testid={emptyTestId}
        >
          {emptyMessage}
        </Text>
      ) : null}

      {children}
    </>
  );
}
