import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { cn } from "@repo/theme/utils";

import { Button } from "../button/Button";
import { buildPageWindow, totalPagesFromCount } from "./build-page-window";

export interface PaginationLabels {
  readonly firstPage?: string;
  readonly previousPage?: string;
  readonly nextPage?: string;
  readonly lastPage?: string;
  readonly page?: (page: number) => string;
}

export interface PaginationProps {
  readonly page: number;
  readonly totalCount: number;
  readonly pageSize?: number;
  readonly onPageChange: (page: number) => void;
  readonly className?: string;
  readonly labels?: PaginationLabels;
}

const defaultLabels: Required<PaginationLabels> = {
  firstPage: "First page",
  previousPage: "Previous page",
  nextPage: "Next page",
  lastPage: "Last page",
  page: (pageNumber) => `Page ${pageNumber}`,
};

export function Pagination({
  page,
  totalCount,
  pageSize = 20,
  onPageChange,
  className,
  labels: labelsProp,
}: PaginationProps) {
  const labels = { ...defaultLabels, ...labelsProp };
  const totalPages = totalPagesFromCount(totalCount, pageSize);

  if (totalPages <= 1) {
    return null;
  }

  const window = buildPageWindow(page, totalPages, 1);

  return (
    <nav
      className={cn(
        "flex flex-wrap items-center justify-center gap-1",
        className,
      )}
      aria-label="Pagination"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(1)}
        aria-label={labels.firstPage}
        className="size-8 px-0"
      >
        <ChevronsLeft className="size-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label={labels.previousPage}
        className="size-8 px-0"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </Button>

      {window.map((entry, index) =>
        entry === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="text-muted-foreground px-2 text-sm"
            aria-hidden
          >
            …
          </span>
        ) : (
          <Button
            key={entry}
            type="button"
            variant={entry === page ? "primary" : "outline"}
            size="sm"
            onClick={() => onPageChange(entry)}
            aria-label={labels.page(entry)}
            aria-current={entry === page ? "page" : undefined}
            className="min-w-8 px-2"
          >
            {entry}
          </Button>
        ),
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label={labels.nextPage}
        className="size-8 px-0"
      >
        <ChevronRight className="size-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(totalPages)}
        aria-label={labels.lastPage}
        className="size-8 px-0"
      >
        <ChevronsRight className="size-4" aria-hidden />
      </Button>
    </nav>
  );
}
