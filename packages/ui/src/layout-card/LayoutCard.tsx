import {
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useState,
} from "react";

import { cn } from "@repo/theme/utils";

export interface LayoutCardProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly actions?: ReactNode;
  readonly interactive?: boolean;
}

function shouldIgnoreCardFlash(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest(
      "a, button, [role='button'], input, select, textarea, [data-card-action]",
    ) != null
  );
}

export function LayoutCard({
  children,
  actions,
  interactive = false,
  className,
  onClick,
  ...props
}: LayoutCardProps) {
  const [flashTick, setFlashTick] = useState(0);

  const triggerFlash = useCallback(() => {
    setFlashTick((tick) => tick + 1);
  }, []);

  const handleClick = useCallback<
    NonNullable<HTMLAttributes<HTMLDivElement>["onClick"]>
  >(
    (event) => {
      if (interactive && !shouldIgnoreCardFlash(event.target)) {
        triggerFlash();
      }

      onClick?.(event);
    },
    [interactive, onClick, triggerFlash],
  );

  return (
    <article
      className={cn(
        "border-border bg-card relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-200",
        interactive &&
          "hover:border-border/80 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.995]",
        className,
      )}
      onClick={handleClick}
      {...props}
    >
      {interactive && flashTick > 0 ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl"
        >
          <div
            key={flashTick}
            className="animate-layout-card-sweep absolute -inset-full bg-[linear-gradient(135deg,transparent_0%,transparent_36%,color-mix(in_oklch,var(--color-primary-300)_18%,transparent)_42%,color-mix(in_oklch,var(--color-primary-400)_42%,white_58%)_50%,color-mix(in_oklch,var(--color-primary-300)_18%,transparent)_58%,transparent_64%,transparent_100%)]"
          />
        </div>
      ) : null}
      {actions ? (
        <div className="absolute end-3 top-3 z-10 shrink-0" data-card-action="">
          {actions}
        </div>
      ) : null}
      <div className="min-h-0 w-full min-w-0">{children}</div>
    </article>
  );
}
