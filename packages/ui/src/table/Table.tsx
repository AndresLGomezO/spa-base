import { forwardRef, type HTMLAttributes, type TdHTMLAttributes } from "react";

import { cn } from "@repo/theme/utils";

export const Table = forwardRef<
  HTMLTableElement,
  HTMLAttributes<HTMLTableElement>
>(function Table({ className, ...props }, ref) {
  return (
    <table
      ref={ref}
      className={cn("w-full table-fixed caption-bottom text-sm", className)}
      {...props}
    />
  );
});

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableHeader({ className, ...props }, ref) {
  return (
    <thead
      ref={ref}
      className={cn(
        "bg-muted dark:bg-neutral-950 [&_tr]:border-border-muted [&_tr]:border-b",
        className,
      )}
      {...props}
    />
  );
});

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableBody({ className, ...props }, ref) {
  return (
    <tbody
      ref={ref}
      className={cn(
        "bg-card dark:bg-neutral-900 [&_tr:last-child]:border-0",
        className,
      )}
      {...props}
    />
  );
});

export const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(function TableRow({ className, ...props }, ref) {
  return (
    <tr
      ref={ref}
      className={cn(
        "border-border-muted hover:bg-muted/50 dark:odd:bg-neutral-950/40 dark:hover:bg-neutral-800 border-b transition-colors",
        className,
      )}
      {...props}
    />
  );
});

export const TableHead = forwardRef<
  HTMLTableCellElement,
  HTMLAttributes<HTMLTableCellElement>
>(function TableHead({ className, ...props }, ref) {
  return (
    <th
      ref={ref}
      className={cn(
        "text-muted-foreground h-12 px-4 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
});

export const TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(function TableCell({ className, ...props }, ref) {
  return (
    <td
      ref={ref}
      className={cn(
        "text-foreground max-w-0 truncate px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
});
