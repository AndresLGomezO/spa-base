import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  DESIGN_LAYOUT_DASHBOARD_NAV_ICON,
  DESIGN_LAYOUT_DETAIL_NAV_ICON,
  DESIGN_LAYOUT_FORMS_NAV_ICON,
  DESIGN_LAYOUT_LIST_NAV_ICON,
  DESIGN_LAYOUT_MAIN_NAV_ICON,
  DESIGN_LAYOUT_PRESETS_NAV_ICON,
  flattenNavGroupLinks,
  isNavGroup,
  isNavSubGroup,
  type NavLinkConfig,
} from "../components/sidebar/nav-config";
import type { EntityCatalogEntry } from "../entities/entity-catalog";
import { MOCK_ENTITY_CATALOG } from "../test/entity-catalog-fixtures";
import { useAccessibleNavItems } from "./useAccessibleNavItems";

const mockUseAuth = vi.fn();
let mockCatalogItems: readonly EntityCatalogEntry[] = MOCK_ENTITY_CATALOG;
let mockDesignLayoutNavLinks: readonly NavLinkConfig[] = [];

const DESIGN_LAYOUT_FEATURE_ICON = {
  main: DESIGN_LAYOUT_MAIN_NAV_ICON,
  list: DESIGN_LAYOUT_LIST_NAV_ICON,
  detail: DESIGN_LAYOUT_DETAIL_NAV_ICON,
  forms: DESIGN_LAYOUT_FORMS_NAV_ICON,
} as const;

const designLayoutFeatureLink = (
  kind: keyof typeof DESIGN_LAYOUT_FEATURE_ICON,
  labelKey:
    | "designLayoutMain"
    | "designLayoutList"
    | "designLayoutDetail"
    | "designLayoutForms",
) => ({
  id: `design-layout-${kind}`,
  labelKey,
  to: `/settings/design-layout/${kind}`,
  matchPath: `/settings/design-layout/${kind}`,
  icon: DESIGN_LAYOUT_FEATURE_ICON[kind],
});

const DESIGN_LAYOUT_LINKS_FIXTURE: readonly NavLinkConfig[] = [
  designLayoutFeatureLink("main", "designLayoutMain"),
  designLayoutFeatureLink("list", "designLayoutList"),
  designLayoutFeatureLink("detail", "designLayoutDetail"),
  designLayoutFeatureLink("forms", "designLayoutForms"),
];

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../entities/entity-catalog-context", () => ({
  useEntityCatalog: () => ({
    items: mockCatalogItems,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    getDefinition: vi.fn(),
    isKnownEntity: vi.fn(),
  }),
}));

vi.mock("../hooks/useEntityNavCategories", () => ({
  useEntityNavCategories: () => ({
    data: [
      {
        id: "cat_sales",
        tenantId: "tenant_a",
        name: "Sales",
        icon: "Tags",
        order: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock("../custom-views/use-custom-view-nav-items", () => ({
  useCustomViewNavItems: () => [],
}));

vi.mock("./design-layout-nav", () => ({
  DESIGN_LAYOUT_MATCH_PATH: "/settings/design-layout",
  DESIGN_LAYOUT_PRESETS_NAV_ITEM: {
    id: "design-layout-presets",
    labelKey: "designLayoutPresets",
    to: "/settings/design-layout/presets",
    matchPath: "/settings/design-layout/presets",
    icon: DESIGN_LAYOUT_PRESETS_NAV_ICON,
  },
  DESIGN_LAYOUT_DASHBOARD_NAV_ITEM: {
    id: "design-layout-dashboard",
    labelKey: "designLayoutDashboard",
    to: "/settings/design-layout/dashboard",
    matchPath: "/settings/design-layout/dashboard",
    icon: DESIGN_LAYOUT_DASHBOARD_NAV_ICON,
  },
  DESIGN_LAYOUT_APP_SHELL_NAV_ITEM: {
    id: "design-layout-app-shell",
    labelKey: "designLayoutAppShell",
    to: "/settings/design-layout/app-shell",
    matchPath: "/settings/design-layout/app-shell",
    icon: DESIGN_LAYOUT_DASHBOARD_NAV_ICON,
  },
  useDesignLayoutNavLinks: () => mockDesignLayoutNavLinks,
}));

function getDataModelEntityIds(
  items: ReturnType<typeof useAccessibleNavItems>,
): string[] {
  const dataModels = items.find((item) => item.id === "data-models");
  if (dataModels && isNavGroup(dataModels)) {
    return dataModels.children.map((child) => child.id);
  }
  return [];
}

const defaultAuth = {
  availableTenants: ["tenant_a"],
};

describe("useAccessibleNavItems", () => {
  it("shows all entities for superadmin", () => {
    mockDesignLayoutNavLinks = [];
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      isSuperAdmin: true,
      permissions: [],
    });

    const { result } = renderHook(() => useAccessibleNavItems());

    expect(getDataModelEntityIds(result.current)).toEqual([
      "testItem",
      "widget",
    ]);
  });

  it("filters entities by read permission for viewers", () => {
    mockDesignLayoutNavLinks = [];
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      isSuperAdmin: false,
      permissions: ["widget.read"],
    });

    const { result } = renderHook(() => useAccessibleNavItems());

    expect(getDataModelEntityIds(result.current)).toEqual(["widget"]);
  });

  it("puts model builder in data structure and automation in analytics group", () => {
    mockDesignLayoutNavLinks = [];
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      isSuperAdmin: false,
      permissions: [
        "entityDefinition.read",
        "hook.read",
        "metricDefinition.read",
        "widget.read",
      ],
    });

    const { result } = renderHook(() => useAccessibleNavItems());
    const dataStructure = result.current.find(
      (item) => item.id === "data-structure",
    );
    const settings = result.current.find((item) => item.id === "settings");
    const analytics = result.current.find((item) => item.id === "analytics");

    expect(dataStructure && isNavGroup(dataStructure)).toBe(true);
    if (dataStructure && isNavGroup(dataStructure)) {
      expect(
        dataStructure.children.some(
          (child) => child.id === "data-model-builder",
        ),
      ).toBe(true);
      expect(
        dataStructure.children.some(
          (child) => child.id === "entity-categories",
        ),
      ).toBe(false);
    }

    expect(analytics && isNavGroup(analytics)).toBe(true);
    if (analytics && isNavGroup(analytics)) {
      expect(
        analytics.children.some((child) => child.id === "automation"),
      ).toBe(true);
      expect(analytics.children.some((child) => child.id === "metrics")).toBe(
        true,
      );
    }

    expect(
      result.current.find((item) => item.id === "automation"),
    ).toBeUndefined();

    // With only these permissions, the settings group has no children.
    expect(settings).toBeUndefined();
  });

  it("shows automation in analytics when hook.read is granted", () => {
    mockDesignLayoutNavLinks = [];
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      isSuperAdmin: false,
      permissions: ["hook.read"],
    });

    const { result } = renderHook(() => useAccessibleNavItems());
    const analytics = result.current.find((item) => item.id === "analytics");

    expect(analytics && isNavGroup(analytics)).toBe(true);
    if (analytics && isNavGroup(analytics)) {
      expect(
        analytics.children.some((child) => child.id === "automation"),
      ).toBe(true);
    }
  });

  it("puts metrics in analytics group, not settings", () => {
    mockDesignLayoutNavLinks = [];
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      isSuperAdmin: false,
      permissions: ["metricDefinition.read"],
    });

    const { result } = renderHook(() => useAccessibleNavItems());
    const analytics = result.current.find((item) => item.id === "analytics");
    const settings = result.current.find((item) => item.id === "settings");

    expect(settings).toBeUndefined();
    expect(analytics && isNavGroup(analytics)).toBe(true);
    if (analytics && isNavGroup(analytics)) {
      expect(analytics.children.some((child) => child.id === "metrics")).toBe(
        true,
      );
    }
  });

  it("shows entity categories in data structure without settings group", () => {
    mockDesignLayoutNavLinks = [];
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      isSuperAdmin: false,
      permissions: ["entityCategory.read"],
    });

    const { result } = renderHook(() => useAccessibleNavItems());
    const dataStructure = result.current.find(
      (item) => item.id === "data-structure",
    );
    const settings = result.current.find((item) => item.id === "settings");

    expect(dataStructure && isNavGroup(dataStructure)).toBe(true);
    if (dataStructure && isNavGroup(dataStructure)) {
      expect(
        dataStructure.children.some(
          (child) => child.id === "entity-categories",
        ),
      ).toBe(true);
    }
    expect(settings).toBeUndefined();
  });

  it("groups categorized entities separately from uncategorized data models", () => {
    mockDesignLayoutNavLinks = [];
    mockCatalogItems = [
      {
        ...MOCK_ENTITY_CATALOG[0],
        navCategoryId: "cat_sales",
        navOrder: 1,
      },
      MOCK_ENTITY_CATALOG[1],
    ];

    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      isSuperAdmin: true,
      permissions: [],
    });

    const { result } = renderHook(() => useAccessibleNavItems());

    const dataModels = result.current.find((item) => item.id === "data-models");
    const salesGroup = result.current.find(
      (item) => item.id === "category-cat_sales",
    );

    expect(dataModels && isNavGroup(dataModels)).toBe(true);
    expect(salesGroup && isNavGroup(salesGroup)).toBe(true);

    if (dataModels && isNavGroup(dataModels)) {
      expect(dataModels.children.map((child) => child.id)).toEqual([
        "testItem",
      ]);
    }
    if (salesGroup && isNavGroup(salesGroup)) {
      expect(salesGroup.label).toBe("Sales");
      expect(salesGroup.children.map((child) => child.id)).toEqual(["widget"]);
    }
  });

  it("shows only home when there are no tenants", () => {
    mockDesignLayoutNavLinks = [];
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
      isSuperAdmin: true,
      permissions: [],
      availableTenants: [],
    });

    const { result } = renderHook(() => useAccessibleNavItems());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]?.id).toBe("home");
  });

  it("shows design layout group when entityUiOverride.read is granted", () => {
    mockDesignLayoutNavLinks = DESIGN_LAYOUT_LINKS_FIXTURE;
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      isSuperAdmin: false,
      permissions: ["entityUiOverride.read", "testItem.read", "widget.read"],
    });

    const { result } = renderHook(() => useAccessibleNavItems());
    const designLayout = result.current.find(
      (item) => item.id === "design-layout",
    );

    expect(designLayout && isNavGroup(designLayout)).toBe(true);
    if (designLayout && isNavGroup(designLayout)) {
      expect(designLayout.children.length).toBe(7);
      expect(
        designLayout.children.some(
          (child) => child.id === "design-layout-app-shell",
        ),
      ).toBe(true);
      expect(
        designLayout.children.some(
          (child) =>
            child.id === "design-layout-detail" &&
            "to" in child &&
            child.to === "/settings/design-layout/detail",
        ),
      ).toBe(true);
      expect(
        designLayout.children.some(
          (child) =>
            child.id === "design-layout-main" &&
            "to" in child &&
            child.to === "/settings/design-layout/main",
        ),
      ).toBe(true);
      expect(
        flattenNavGroupLinks(designLayout).some(
          (link) => link.to === "/settings/design-layout/list",
        ),
      ).toBe(true);
      expect(
        designLayout.children.some(
          (child) => child.id === "design-layout-main",
        ),
      ).toBe(true);
      expect(
        designLayout.children.every(
          (child) => !("children" in child && Array.isArray(child.children)),
        ),
      ).toBe(true);
    }
  });

  it("hides design layout group without entityUiOverride.read", () => {
    mockDesignLayoutNavLinks = [];
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      isSuperAdmin: false,
      permissions: ["testItem.read", "widget.read"],
    });

    const { result } = renderHook(() => useAccessibleNavItems());

    expect(result.current.some((item) => item.id === "design-layout")).toBe(
      false,
    );
  });

  it("shows custom views settings only when create or update is granted", () => {
    mockDesignLayoutNavLinks = [];
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      isSuperAdmin: false,
      permissions: ["customView.read"],
    });

    const { result } = renderHook(() => useAccessibleNavItems());

    const analytics = result.current.find((item) => item.id === "analytics");
    expect(analytics).toBeUndefined();
  });

  it("includes platform current tenant and appearance for superadmin", () => {
    mockDesignLayoutNavLinks = [];
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      isSuperAdmin: true,
      permissions: [],
    });

    const { result } = renderHook(() => useAccessibleNavItems());
    const platform = result.current.find((item) => item.id === "platform");
    expect(platform && isNavGroup(platform)).toBe(true);
    if (platform && isNavGroup(platform)) {
      expect(
        platform.children.some((child) => child.id === "current-tenant"),
      ).toBe(true);
      expect(platform.children.some((child) => child.id === "appearance")).toBe(
        true,
      );
    }
  });

  it("includes all entities subgroup in data structure for superadmin with hidden entities", () => {
    mockDesignLayoutNavLinks = [];
    mockCatalogItems = [
      ...MOCK_ENTITY_CATALOG,
      {
        ...MOCK_ENTITY_CATALOG[0]!,
        name: "internalEntity",
        hiddenFromNav: true,
        permissions: [
          "internalEntity.read",
          "internalEntity.create",
          "internalEntity.update",
          "internalEntity.delete",
        ],
        ui: {
          ...MOCK_ENTITY_CATALOG[0]!.ui,
          nav: { label: "Internal Entity", icon: "box" },
        },
      },
    ];
    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      isSuperAdmin: true,
      permissions: [],
    });

    const { result } = renderHook(() => useAccessibleNavItems());
    const dataStructure = result.current.find(
      (item) => item.id === "data-structure",
    );

    expect(dataStructure && isNavGroup(dataStructure)).toBe(true);
    if (dataStructure && isNavGroup(dataStructure)) {
      const allEntities = dataStructure.children.find(
        (child) => isNavSubGroup(child) && child.id === "all-entities",
      );
      expect(allEntities && isNavSubGroup(allEntities)).toBe(true);
      if (allEntities && isNavSubGroup(allEntities)) {
        expect(allEntities.children.map((child) => child.id)).toEqual(
          expect.arrayContaining([
            "admin-entity-internalEntity",
            "admin-entity-testItem",
            "admin-entity-widget",
          ]),
        );
        const hiddenLink = allEntities.children.find(
          (child) => child.id === "admin-entity-internalEntity",
        );
        expect(hiddenLink?.label).toContain("Internal Entity");
        expect(hiddenLink?.to).toBe("/app/all-entities/internalEntity");
        expect(hiddenLink?.matchPath).toBe("/app/all-entities/internalEntity");

        const visibleLink = allEntities.children.find(
          (child) => child.id === "admin-entity-widget",
        );
        expect(visibleLink?.to).toBe("/app/all-entities/widget");
        expect(visibleLink?.matchPath).toBe("/app/all-entities/widget");
      }
    }
  });

  it("includes all entities subgroup in data structure for internal entity readers", () => {
    mockDesignLayoutNavLinks = [];
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      isSuperAdmin: false,
      permissions: ["internalEntity.read", "widget.read", "testItem.read"],
    });

    const { result } = renderHook(() => useAccessibleNavItems());
    const dataStructure = result.current.find(
      (item) => item.id === "data-structure",
    );

    expect(dataStructure && isNavGroup(dataStructure)).toBe(true);
    if (dataStructure && isNavGroup(dataStructure)) {
      const allEntities = dataStructure.children.find(
        (child) => isNavSubGroup(child) && child.id === "all-entities",
      );
      expect(allEntities && isNavSubGroup(allEntities)).toBe(true);
      if (allEntities && isNavSubGroup(allEntities)) {
        expect(allEntities.children.map((child) => child.id)).toEqual([
          "admin-entity-testItem",
          "admin-entity-widget",
        ]);
      }
    }
  });

  it("includes debugger group with separate source links when hook.read is granted", () => {
    mockDesignLayoutNavLinks = [];
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      isSuperAdmin: false,
      permissions: ["hook.read"],
    });

    const { result } = renderHook(() => useAccessibleNavItems());
    const debuggerGroup = result.current.find((item) => item.id === "debugger");

    expect(debuggerGroup && isNavGroup(debuggerGroup)).toBe(true);
    if (debuggerGroup && isNavGroup(debuggerGroup)) {
      expect(
        debuggerGroup.children.some(
          (child) => child.id === "debugger-hook-executions",
        ),
      ).toBe(true);
      expect(
        debuggerGroup.children.some(
          (child) => child.id === "debugger-hook-logs",
        ),
      ).toBe(true);
      expect(
        debuggerGroup.children.some((child) => child.id === "debugger-ai-jobs"),
      ).toBe(false);

      const hookExecutions = debuggerGroup.children.find(
        (child) => child.id === "debugger-hook-executions",
      );
      expect(
        hookExecutions && "to" in hookExecutions && hookExecutions.to,
      ).toBe("/debugger/hook-executions");
    }

    const settings = result.current.find((item) => item.id === "settings");
    if (settings && isNavGroup(settings)) {
      expect(
        settings.children.some((child) => child.id === "ai-debugger"),
      ).toBe(false);
    }
  });
});
