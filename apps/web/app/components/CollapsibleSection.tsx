import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleSectionProps {
  readonly title: ReactNode;
  readonly defaultOpen?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
}

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={className ?? "flex flex-col gap-3"}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="hover:bg-muted/50 flex w-full items-center gap-2 rounded-md px-1 py-1 text-left"
      >
        <span className="font-semibold">{title}</span>
        <ChevronDown
          className={`text-muted-foreground ml-auto size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? children : null}
    </section>
  );
}
