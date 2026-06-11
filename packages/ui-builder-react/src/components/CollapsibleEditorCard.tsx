import { useState, type ReactNode } from "react";

import { IconButton } from "@repo/ui";

function PlusIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export interface CollapsibleEditorCardProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onAdd?: () => void;
  readonly addLabel?: string;
  readonly addTrigger?: ReactNode;
  readonly headerEnd?: ReactNode;
  readonly className?: string;
}

export function CollapsibleEditorCard({
  title,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  onAdd,
  addLabel,
  addTrigger,
  headerEnd,
  className,
}: CollapsibleEditorCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;

  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (controlledOpen === undefined) {
      setInternalOpen(next);
    }
  };

  return (
    <section
      className={
        className ??
        "from-card to-muted/40 flex flex-col rounded-xl bg-gradient-to-b shadow-md"
      }
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md border-0 px-1 py-1 text-left transition-colors duration-200"
        >
          <span className="text-foreground text-sm font-semibold">{title}</span>
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className={`text-muted-foreground ml-auto size-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {addTrigger ??
          (onAdd ? (
            <IconButton
              type="button"
              label={addLabel ?? "Add"}
              size="sm"
              onClick={() => {
                setOpen(true);
                onAdd();
              }}
            >
              <PlusIcon />
            </IconButton>
          ) : null)}
        {headerEnd}
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2 px-3 pb-3">{children}</div>
        </div>
      </div>
    </section>
  );
}
