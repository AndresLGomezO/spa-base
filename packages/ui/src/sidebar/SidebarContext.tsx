import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";
const DEFAULT_MOBILE_BREAKPOINT_PX = 768;

export type SidebarState = "expanded" | "collapsed";

export interface SidebarContextValue {
  readonly state: SidebarState;
  readonly collapsed: boolean;
  readonly isMobile: boolean;
  readonly mobileOpen: boolean;
  readonly setMobileOpen: (open: boolean) => void;
  readonly toggleSidebar: () => void;
  /** CSS class that hides the hamburger header at/above the hamburger breakpoint. */
  readonly hamburgerHiddenClassName: string;
  readonly hamburgerBreakpointPx: number;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function readCollapsedPreference(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function hamburgerHiddenClassForPx(breakpointPx: number): string {
  if (breakpointPx <= 390) {
    return "max-[389px]:flex min-[390px]:hidden";
  }
  if (breakpointPx <= 640) {
    return "sm:hidden";
  }
  if (breakpointPx <= 768) {
    return "md:hidden";
  }
  if (breakpointPx <= 1024) {
    return "lg:hidden";
  }
  return "xl:hidden";
}

function useIsMobile(breakpointPx: number): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);

    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [breakpointPx]);

  return isMobile;
}

function useAutoCollapse(
  autoCollapseBreakpointPx: number | null | undefined,
  setCollapsed: (value: boolean | ((current: boolean) => boolean)) => void,
): void {
  useEffect(() => {
    if (autoCollapseBreakpointPx == null || autoCollapseBreakpointPx <= 0) {
      return;
    }

    const media = window.matchMedia(
      `(max-width: ${autoCollapseBreakpointPx - 1}px)`,
    );

    const update = () => {
      if (media.matches) {
        setCollapsed(true);
      }
    };

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [autoCollapseBreakpointPx, setCollapsed]);
}

interface SidebarProviderProps {
  readonly children: ReactNode;
  readonly defaultCollapsed?: boolean;
  /** Width below which the sidebar uses the mobile sheet + hamburger. Default 768. */
  readonly hamburgerBreakpointPx?: number;
  /** Width below which the sidebar auto-collapses to icon mode. Null/undefined = off. */
  readonly autoCollapseBreakpointPx?: number | null;
}

export function SidebarProvider({
  children,
  defaultCollapsed = false,
  hamburgerBreakpointPx = DEFAULT_MOBILE_BREAKPOINT_PX,
  autoCollapseBreakpointPx = null,
}: SidebarProviderProps) {
  const isMobile = useIsMobile(hamburgerBreakpointPx);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsedPreference());
    setHydrated(true);
  }, []);

  useAutoCollapse(autoCollapseBreakpointPx, setCollapsed);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen((open) => !open);
      return;
    }

    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [isMobile]);

  const hamburgerHiddenClassName = useMemo(
    () => hamburgerHiddenClassForPx(hamburgerBreakpointPx),
    [hamburgerBreakpointPx],
  );

  const value = useMemo<SidebarContextValue>(
    () => ({
      state: collapsed ? "collapsed" : "expanded",
      collapsed: hydrated ? collapsed : defaultCollapsed,
      isMobile,
      mobileOpen,
      setMobileOpen,
      toggleSidebar,
      hamburgerHiddenClassName,
      hamburgerBreakpointPx,
    }),
    [
      collapsed,
      defaultCollapsed,
      hamburgerBreakpointPx,
      hamburgerHiddenClassName,
      hydrated,
      isMobile,
      mobileOpen,
      toggleSidebar,
    ],
  );

  return <SidebarContext value={value}>{children}</SidebarContext>;
}

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}
