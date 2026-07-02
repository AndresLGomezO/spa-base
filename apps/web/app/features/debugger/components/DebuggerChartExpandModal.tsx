import { Modal } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import type { ReactNode } from "react";

export function DebuggerChartExpandModal({
  open,
  onClose,
  title,
  children,
  contentLayout = "default",
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly children: ReactNode;
  readonly contentLayout?: "default" | "contain";
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="xl" scrollable>
      <div
        className={cn(
          contentLayout === "contain"
            ? "flex w-full items-center justify-center"
            : "py-2",
        )}
      >
        {children}
      </div>
    </Modal>
  );
}
