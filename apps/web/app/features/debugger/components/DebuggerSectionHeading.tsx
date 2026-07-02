import { Heading } from "@repo/ui";
import type { LucideIcon } from "lucide-react";

export function DebuggerSectionHeading({
  icon: Icon,
  children,
}: {
  readonly icon: LucideIcon;
  readonly children: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon aria-hidden className="text-muted-foreground size-4 shrink-0" />
      <Heading level={3}>{children}</Heading>
    </div>
  );
}
