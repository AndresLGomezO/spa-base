import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@repo/theme/utils";

import { Button } from "../button/Button";
import { Text } from "../typography/Text";

export interface CursorPaginationLabels {
  readonly previousPage?: string;
  readonly nextPage?: string;
  readonly pageIndicator?: (page: number) => string;
}

export interface CursorPaginationProps {
  readonly page: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly onNextPage: () => void;
  readonly onPreviousPage: () => void;
  readonly className?: string;
  readonly labels?: CursorPaginationLabels;
}

const defaultLabels: Required<CursorPaginationLabels> = {
  previousPage: "Previous page",
  nextPage: "Next page",
  pageIndicator: (page) => `Page ${page}`,
};

export function CursorPagination({
  page,
  hasNextPage,
  hasPreviousPage,
  onNextPage,
  onPreviousPage,
  className,
  labels: labelsProp,
}: CursorPaginationProps) {
  const labels = { ...defaultLabels, ...labelsProp };

  if (!hasNextPage && !hasPreviousPage) {
    return null;
  }

  return (
    <nav
      className={cn("flex items-center justify-center gap-2", className)}
      aria-label="Pagination"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!hasPreviousPage}
        onClick={onPreviousPage}
        aria-label={labels.previousPage}
        className="size-8 px-0"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </Button>

      <Text className="text-muted-foreground text-sm tabular-nums">
        {labels.pageIndicator(page)}
      </Text>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!hasNextPage}
        onClick={onNextPage}
        aria-label={labels.nextPage}
        className="size-8 px-0"
      >
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </nav>
  );
}
