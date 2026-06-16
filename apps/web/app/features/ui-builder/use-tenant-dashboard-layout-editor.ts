import { useCallback, useEffect, useState } from "react";
import type { DashboardSectionDefinition } from "@repo/entities";
import { putTenantDashboardLayoutInputSchema } from "@repo/entities";
import {
  ensureContainerRoot,
  migrateViewSearchFilterLayout,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getTenantDashboardLayout,
  putTenantDashboardLayout,
} from "../../lib/api-client";
import { createDefaultDashboardLayout } from "./create-default-dashboard-layout";
import { createDefaultDashboardSection } from "./create-default-dashboard-section";

const TENANT_DASHBOARD_LAYOUT_QUERY_KEY = ["tenant-dashboard-layout"] as const;

function normalizeSectionList(
  sections: readonly DashboardSectionDefinition[],
): DashboardSectionDefinition[] {
  return sections.map((section) => ({
    ...section,
    layout: migrateViewSearchFilterLayout(ensureContainerRoot(section.layout)),
  }));
}

function normalizeDashboardLayout(layout: UiLayoutDocument): UiLayoutDocument {
  return migrateViewSearchFilterLayout(ensureContainerRoot(layout));
}

function resolveInitialDashboardLayout(
  existing: UiLayoutDocument | undefined,
): UiLayoutDocument {
  if (existing) {
    return normalizeDashboardLayout(existing);
  }

  return createDefaultDashboardLayout();
}

function resolveInitialSections(
  existing: readonly DashboardSectionDefinition[] | undefined,
): DashboardSectionDefinition[] {
  if (!existing || existing.length === 0) {
    return [];
  }

  return normalizeSectionList(existing);
}

export function useTenantDashboardLayoutEditor() {
  const queryClient = useQueryClient();
  const configQuery = useQuery({
    queryKey: TENANT_DASHBOARD_LAYOUT_QUERY_KEY,
    queryFn: async () => {
      const result = await getTenantDashboardLayout();
      return result.config;
    },
  });

  const [dashboardSections, setDashboardSectionsState] = useState<
    DashboardSectionDefinition[]
  >([]);
  const [dashboardLayout, setDashboardLayoutState] = useState<UiLayoutDocument>(
    () => createDefaultDashboardLayout(),
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!configQuery.data || isHydrated) {
      return;
    }

    const nextSections = resolveInitialSections(
      configQuery.data.dashboardSections,
    );
    setDashboardSectionsState(nextSections);
    setDashboardLayoutState(
      resolveInitialDashboardLayout(configQuery.data.dashboardLayout),
    );
    setSelectedSectionId(nextSections[0]?.id ?? "");
    setIsHydrated(true);
  }, [configQuery.data, isHydrated]);

  useEffect(() => {
    if (dashboardSections.length === 0) {
      if (selectedSectionId !== "") {
        setSelectedSectionId("");
      }
      return;
    }

    if (
      !dashboardSections.some((section) => section.id === selectedSectionId)
    ) {
      setSelectedSectionId(dashboardSections[0]?.id ?? "");
    }
  }, [dashboardSections, selectedSectionId]);

  const setDashboardSections = useCallback(
    (next: readonly DashboardSectionDefinition[]) => {
      const normalized =
        next.length > 0
          ? normalizeSectionList(next)
          : ([] as DashboardSectionDefinition[]);
      setDashboardSectionsState(normalized);
      setSelectedSectionId((current) => {
        if (normalized.some((section) => section.id === current)) {
          return current;
        }
        return normalized[0]?.id ?? "";
      });
    },
    [],
  );

  const setDashboardLayout = useCallback((layout: UiLayoutDocument) => {
    setDashboardLayoutState(normalizeDashboardLayout(layout));
  }, []);

  const selectedSection = dashboardSections.find(
    (section) => section.id === selectedSectionId,
  );

  const updateSectionLayout = useCallback(
    (sectionId: string, layout: UiLayoutDocument) => {
      setDashboardSectionsState((current) =>
        current.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                layout: ensureContainerRoot(layout),
              }
            : section,
        ),
      );
    },
    [],
  );

  const updateSelectedSectionLayout = useCallback(
    (layout: UiLayoutDocument) => {
      if (!selectedSectionId) {
        return;
      }
      updateSectionLayout(selectedSectionId, layout);
    },
    [selectedSectionId, updateSectionLayout],
  );

  const addSection = useCallback((name: string) => {
    const section = createDefaultDashboardSection(name);
    setDashboardSectionsState((current) => [...current, section]);
    setSelectedSectionId(section.id);
    return section.id;
  }, []);

  const removeSection = useCallback((sectionId: string) => {
    setDashboardSectionsState((current) => {
      const next = current.filter((section) => section.id !== sectionId);
      setSelectedSectionId((selected) => {
        if (selected === sectionId) {
          return next[0]?.id ?? "";
        }
        return selected;
      });
      return next;
    });
  }, []);

  const renameSection = useCallback((sectionId: string, name: string) => {
    setDashboardSectionsState((current) =>
      current.map((section) =>
        section.id === sectionId ? { ...section, name } : section,
      ),
    );
  }, []);

  const saveSections = useCallback(async (): Promise<string | null> => {
    setIsSaving(true);
    try {
      const payload = putTenantDashboardLayoutInputSchema.parse({
        dashboardSections,
        dashboardLayout,
      });
      const { config } = await putTenantDashboardLayout(payload);
      await queryClient.invalidateQueries({
        queryKey: TENANT_DASHBOARD_LAYOUT_QUERY_KEY,
      });
      setDashboardSectionsState(
        resolveInitialSections(config.dashboardSections),
      );
      setDashboardLayoutState(
        resolveInitialDashboardLayout(config.dashboardLayout),
      );
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Failed to save sections.";
    } finally {
      setIsSaving(false);
    }
  }, [dashboardLayout, dashboardSections, queryClient]);

  const saveLayout = useCallback(async (): Promise<string | null> => {
    setIsSaving(true);
    try {
      const payload = putTenantDashboardLayoutInputSchema.parse({
        dashboardSections,
        dashboardLayout,
      });
      const { config } = await putTenantDashboardLayout(payload);
      await queryClient.invalidateQueries({
        queryKey: TENANT_DASHBOARD_LAYOUT_QUERY_KEY,
      });
      setDashboardSectionsState(
        resolveInitialSections(config.dashboardSections),
      );
      setDashboardLayoutState(
        resolveInitialDashboardLayout(config.dashboardLayout),
      );
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Failed to save layout.";
    } finally {
      setIsSaving(false);
    }
  }, [dashboardLayout, dashboardSections, queryClient]);

  return {
    isLoading: configQuery.isLoading,
    isHydrated,
    dashboardSections,
    setDashboardSections,
    dashboardLayout,
    setDashboardLayout,
    selectedSectionId,
    setSelectedSectionId,
    selectedSection,
    updateSectionLayout,
    updateSelectedSectionLayout,
    addSection,
    removeSection,
    renameSection,
    isSaving,
    saveSections,
    saveLayout,
  };
}

export type UseTenantDashboardLayoutEditorResult = ReturnType<
  typeof useTenantDashboardLayoutEditor
>;
