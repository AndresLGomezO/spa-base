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
const MOBILE_BREAKPOINT = 768;

export type SidebarState = "expanded" | "collapsed";

export interface SidebarContextValue {
  readonly state: SidebarState;
  readonly collapsed: boolean;
  readonly isMobile: boolean;
  readonly mobileOpen: boolean;
  readonly setMobileOpen: (open: boolean) => void;
  readonly toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function readCollapsedPreference(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

interface SidebarProviderProps {
  readonly children: ReactNode;
  readonly defaultCollapsed?: boolean;
}

export function SidebarProvider({
  children,
  defaultCollapsed = false,
}: SidebarProviderProps) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsedPreference());
    setHydrated(true);
  }, []);

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

  const value = useMemo<SidebarContextValue>(
    () => ({
      state: collapsed ? "collapsed" : "expanded",
      collapsed: hydrated ? collapsed : defaultCollapsed,
      isMobile,
      mobileOpen,
      setMobileOpen,
      toggleSidebar,
    }),
    [
      collapsed,
      defaultCollapsed,
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
