import type { ReactNode } from "react";

interface DesignLayoutEditorShellProps {
  readonly children: ReactNode;
  readonly preview?: ReactNode;
}

/** Layout wrapper for design editors: main panel + optional preview column. */
export function DesignLayoutEditorShell({
  children,
  preview,
}: DesignLayoutEditorShellProps) {
  if (!preview) {
    return <div className="flex flex-col gap-6">{children}</div>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col-reverse gap-6 lg:flex-row lg:gap-8">
      <div className="flex min-w-0 flex-1 flex-col gap-6">{children}</div>
      <div className="lg:sticky lg:top-4 lg:w-[min(420px,40%)] lg:shrink-0">
        {preview}
      </div>
    </div>
  );
}
