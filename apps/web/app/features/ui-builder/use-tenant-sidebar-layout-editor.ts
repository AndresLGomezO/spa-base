import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SIDEBAR_HAMBURGER_BREAKPOINT,
  putTenantSidebarLayoutInputSchema,
  type TenantSidebarLayoutSettings,
} from "@repo/entities";
import {
  ensureAppShellScreenRoot,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getTenantSidebarLayout,
  putTenantSidebarLayout,
  deleteTenantSidebarLayout,
} from "../../lib/api-client";
import {
  createDefaultSidebarLayout,
  createDefaultSidebarLayoutSettings,
} from "./create-default-sidebar-layout";
import {
  createDefaultFooterLayout,
  createDefaultHeaderLayout,
} from "./create-default-header-footer-layout";

export const TENANT_SIDEBAR_LAYOUT_QUERY_KEY = [
  "tenant-sidebar-layout",
] as const;

function normalizeLayout(layout: UiLayoutDocument): UiLayoutDocument {
  return ensureAppShellScreenRoot(layout);
}

function normalizeSettings(
  settings: TenantSidebarLayoutSettings | undefined,
): TenantSidebarLayoutSettings {
  if (!settings) {
    return createDefaultSidebarLayoutSettings();
  }

  return {
    autoCollapseBreakpoint: settings.autoCollapseBreakpoint ?? null,
    hamburgerBreakpoint:
      settings.hamburgerBreakpoint ?? DEFAULT_SIDEBAR_HAMBURGER_BREAKPOINT,
  };
}

export type UseTenantSidebarLayoutEditorResult = {
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly isHydrated: boolean;
  readonly hasTenantOverride: boolean;
  readonly sidebarLayout: UiLayoutDocument;
  readonly setSidebarLayout: (layout: UiLayoutDocument) => void;
  readonly headerLayout: UiLayoutDocument;
  readonly setHeaderLayout: (layout: UiLayoutDocument) => void;
  readonly footerLayout: UiLayoutDocument;
  readonly setFooterLayout: (layout: UiLayoutDocument) => void;
  readonly settings: TenantSidebarLayoutSettings;
  readonly setSettings: (settings: TenantSidebarLayoutSettings) => void;
  readonly isSaving: boolean;
  readonly saveLayout: () => Promise<string | null>;
  readonly resetToPlatformDefault: () => Promise<string | null>;
  readonly refetch: () => Promise<void>;
};

export function useTenantSidebarLayoutEditor(): UseTenantSidebarLayoutEditorResult {
  const queryClient = useQueryClient();
  const configQuery = useQuery({
    queryKey: TENANT_SIDEBAR_LAYOUT_QUERY_KEY,
    queryFn: async () => getTenantSidebarLayout(),
  });

  const [sidebarLayout, setSidebarLayoutState] = useState<UiLayoutDocument>(
    () => createDefaultSidebarLayout(),
  );
  const [headerLayout, setHeaderLayoutState] = useState<UiLayoutDocument>(() =>
    createDefaultHeaderLayout(),
  );
  const [footerLayout, setFooterLayoutState] = useState<UiLayoutDocument>(() =>
    createDefaultFooterLayout(),
  );
  const [settings, setSettingsState] = useState<TenantSidebarLayoutSettings>(
    () => createDefaultSidebarLayoutSettings(),
  );
  const [hasTenantOverride, setHasTenantOverride] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!configQuery.data || isHydrated) {
      return;
    }

    if (configQuery.data.exists) {
      const { config } = configQuery.data;
      setSidebarLayoutState(normalizeLayout(config.sidebarLayout));
      setHeaderLayoutState(normalizeLayout(config.headerLayout));
      setFooterLayoutState(normalizeLayout(config.footerLayout));
      setSettingsState(normalizeSettings(config.settings));
      setHasTenantOverride(true);
    } else {
      setSidebarLayoutState(createDefaultSidebarLayout());
      setHeaderLayoutState(createDefaultHeaderLayout());
      setFooterLayoutState(createDefaultFooterLayout());
      setSettingsState(createDefaultSidebarLayoutSettings());
      setHasTenantOverride(false);
    }
    setIsHydrated(true);
  }, [configQuery.data, isHydrated]);

  const setSidebarLayout = useCallback((layout: UiLayoutDocument) => {
    setSidebarLayoutState(normalizeLayout(layout));
  }, []);

  const setHeaderLayout = useCallback((layout: UiLayoutDocument) => {
    setHeaderLayoutState(normalizeLayout(layout));
  }, []);

  const setFooterLayout = useCallback((layout: UiLayoutDocument) => {
    setFooterLayoutState(normalizeLayout(layout));
  }, []);

  const setSettings = useCallback((next: TenantSidebarLayoutSettings) => {
    setSettingsState(normalizeSettings(next));
  }, []);

  const saveLayout = useCallback(async (): Promise<string | null> => {
    setIsSaving(true);
    try {
      const payload = putTenantSidebarLayoutInputSchema.parse({
        sidebarLayout,
        headerLayout,
        footerLayout,
        settings,
      });
      const { config } = await putTenantSidebarLayout(payload);
      await queryClient.invalidateQueries({
        queryKey: TENANT_SIDEBAR_LAYOUT_QUERY_KEY,
      });
      setSidebarLayoutState(normalizeLayout(config.sidebarLayout));
      setHeaderLayoutState(normalizeLayout(config.headerLayout));
      setFooterLayoutState(normalizeLayout(config.footerLayout));
      setSettingsState(normalizeSettings(config.settings));
      setHasTenantOverride(true);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Failed to save layout.";
    } finally {
      setIsSaving(false);
    }
  }, [footerLayout, headerLayout, queryClient, settings, sidebarLayout]);

  const resetToPlatformDefault = useCallback(async (): Promise<
    string | null
  > => {
    setIsSaving(true);
    try {
      await deleteTenantSidebarLayout();
      await queryClient.invalidateQueries({
        queryKey: TENANT_SIDEBAR_LAYOUT_QUERY_KEY,
      });
      setSidebarLayoutState(createDefaultSidebarLayout());
      setHeaderLayoutState(createDefaultHeaderLayout());
      setFooterLayoutState(createDefaultFooterLayout());
      setSettingsState(createDefaultSidebarLayoutSettings());
      setHasTenantOverride(false);
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Failed to reset app shell layout.";
    } finally {
      setIsSaving(false);
    }
  }, [queryClient]);

  const refetch = useCallback(async () => {
    setIsHydrated(false);
    await queryClient.invalidateQueries({
      queryKey: TENANT_SIDEBAR_LAYOUT_QUERY_KEY,
    });
  }, [queryClient]);

  return {
    isLoading: configQuery.isLoading,
    isError: configQuery.isError,
    isHydrated,
    hasTenantOverride,
    sidebarLayout,
    setSidebarLayout,
    headerLayout,
    setHeaderLayout,
    footerLayout,
    setFooterLayout,
    settings,
    setSettings,
    isSaving,
    saveLayout,
    resetToPlatformDefault,
    refetch,
  };
}
