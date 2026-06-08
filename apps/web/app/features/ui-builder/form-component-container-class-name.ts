import { cn } from "@repo/theme/utils";

/** Drops flex-grow utilities so form slots stay content-sized. */
export function formComponentContainerClassName(className?: string): string {
  const stripped = className
    ?.split(/\s+/)
    .filter(
      (part) =>
        part.length > 0 &&
        !part.startsWith("flex-[") &&
        part !== "flex-1" &&
        part !== "grow",
    )
    .join(" ");

  return cn("w-full", stripped);
}
