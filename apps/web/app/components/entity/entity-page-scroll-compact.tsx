import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@repo/theme/utils";

import { entityListPageSlotClassName } from "./entity-list-table-layout";

/** Shared easing for entity page chrome collapse/expand. */
export const ENTITY_PAGE_CHROME_TRANSITION =
  "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";

const COMPACT_SCROLL_THRESHOLD = 48;
const EXPAND_SCROLL_THRESHOLD = 16;
const COMPACT_PROGRESS_END = 72;
const MAX_LG_MEDIA_QUERY = "(max-width: 1023px)";

function computeCompactProgress(scrollTop: number): number {
  if (scrollTop <= 0) {
    return 0;
  }
  if (scrollTop >= COMPACT_PROGRESS_END) {
    return 1;
  }
  return scrollTop / COMPACT_PROGRESS_END;
}

function useMaxLg(): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(MAX_LG_MEDIA_QUERY);

    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return matches;
}

interface EntityPageScrollCompactContextValue {
  readonly isCompact: boolean;
  readonly compactProgress: number;
  readonly registerScrollContainer: (element: HTMLElement | null) => void;
}

const EntityPageScrollCompactContext =
  createContext<EntityPageScrollCompactContextValue | null>(null);

export function EntityPageScrollCompactProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const isMaxLg = useMaxLg();
  const [isCompact, setIsCompact] = useState(false);
  const [compactProgress, setCompactProgress] = useState(0);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

  const registerScrollContainer = useCallback((element: HTMLElement | null) => {
    setScrollElement(element);
  }, []);

  useEffect(() => {
    if (!scrollElement || !isMaxLg) {
      setIsCompact(false);
      setCompactProgress(0);
      return;
    }

    const handleScroll = () => {
      const scrollTop = scrollElement.scrollTop;
      setCompactProgress(computeCompactProgress(scrollTop));
      setIsCompact((previous) => {
        if (!previous && scrollTop > COMPACT_SCROLL_THRESHOLD) {
          return true;
        }
        if (previous && scrollTop < EXPAND_SCROLL_THRESHOLD) {
          return false;
        }
        return previous;
      });
    };

    handleScroll();
    scrollElement.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [isMaxLg, scrollElement]);

  const value = useMemo(
    () => ({ isCompact, compactProgress, registerScrollContainer }),
    [compactProgress, isCompact, registerScrollContainer],
  );

  return (
    <EntityPageScrollCompactContext.Provider value={value}>
      {children}
    </EntityPageScrollCompactContext.Provider>
  );
}

export function useEntityPageScrollCompact(): EntityPageScrollCompactContextValue {
  const context = useContext(EntityPageScrollCompactContext);
  if (context == null) {
    throw new Error(
      "useEntityPageScrollCompact must be used within EntityPageScrollCompactProvider",
    );
  }
  return context;
}

interface EntityPageListScrollContainerProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function EntityPageListScrollContainer({
  children,
  className,
}: EntityPageListScrollContainerProps) {
  const { registerScrollContainer, compactProgress } =
    useEntityPageScrollCompact();
  const fadeOpacity = 0.4 + compactProgress * 0.6;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        ref={registerScrollContainer}
        data-entity-page-list-scroll=""
        className={cn(entityListPageSlotClassName, className)}
      >
        {children}
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 h-12",
          "bg-gradient-to-b from-background via-background/85 to-transparent",
          ENTITY_PAGE_CHROME_TRANSITION,
        )}
        style={{ opacity: fadeOpacity }}
      />
    </div>
  );
}
