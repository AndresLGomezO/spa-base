import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@repo/theme/utils";

interface JsonTreeViewerProps {
  readonly value: unknown;
  readonly className?: string;
}

function formatPrimitive(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  return String(value);
}

function primitiveClassName(value: unknown): string {
  if (value === null) {
    return "text-muted-foreground";
  }
  if (typeof value === "string") {
    return "text-emerald-700 dark:text-emerald-300";
  }
  if (typeof value === "number") {
    return "text-sky-700 dark:text-sky-300";
  }
  if (typeof value === "boolean") {
    return "text-amber-700 dark:text-amber-300";
  }
  return "text-foreground";
}

function JsonTreeNode({
  label,
  value,
  depth = 0,
  defaultExpanded = depth < 2,
}: {
  readonly label?: string;
  readonly value: unknown;
  readonly depth?: number;
  readonly defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (Array.isArray(value)) {
    const labelText = label ?? `[${value.length}]`;
    return (
      <div className="font-mono text-xs leading-5">
        <button
          type="button"
          className="hover:bg-muted/60 inline-flex items-center gap-1 rounded px-1"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? (
            <ChevronDown className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          )}
          <span className="text-foreground">{labelText}</span>
        </button>
        {expanded ? (
          <div className="border-border ml-3 border-l pl-2">
            {value.map((entry, index) => (
              <JsonTreeNode
                key={index}
                label={`[${index}]`}
                value={entry}
                depth={depth + 1}
                defaultExpanded={depth < 1}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const labelText = label ?? "{…}";
    return (
      <div className="font-mono text-xs leading-5">
        <button
          type="button"
          className="hover:bg-muted/60 inline-flex items-center gap-1 rounded px-1"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? (
            <ChevronDown className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          )}
          <span className="text-foreground">{labelText}</span>
        </button>
        {expanded ? (
          <div className="border-border ml-3 border-l pl-2">
            {entries.map(([key, entry]) => (
              <JsonTreeNode
                key={key}
                label={key}
                value={entry}
                depth={depth + 1}
                defaultExpanded={depth < 1}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="font-mono text-xs leading-5">
      {label ? <span className="text-muted-foreground">{label}: </span> : null}
      <span className={primitiveClassName(value)}>
        {formatPrimitive(value)}
      </span>
    </div>
  );
}

export function JsonTreeViewer({ value, className }: JsonTreeViewerProps) {
  const content: ReactNode =
    value === undefined ? null : Array.isArray(value) ||
      (value !== null && typeof value === "object") ? (
      <JsonTreeNode value={value} defaultExpanded />
    ) : (
      <span className={cn("font-mono text-xs", primitiveClassName(value))}>
        {formatPrimitive(value)}
      </span>
    );

  return (
    <div
      className={cn(
        "bg-muted/30 max-h-96 overflow-auto rounded-md border p-3",
        className,
      )}
    >
      {content}
    </div>
  );
}
