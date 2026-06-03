import { renderHook } from "@testing-library/react";
import { Database } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import {
  flattenNavGroupLinks,
  isNavGroup,
  isNavSubGroup,
  type NavSubGroupConfig,
} from "../components/sidebar/nav-config";
import type { EntityCatalogEntry } from "../entities/entity-catalog";
import { MOCK_ENTITY_CATALOG } from "../test/entity-catalog-fixtures";
import { useAccessibleNavItems } from "./useAccessibleNavItems";

const mockUseAuth = vi.fn();
let mockCatalogItems: readonly EntityCatalogEntry[] = MOCK_ENTITY_CATALOG;
let mockDesignLayoutSubGroups: readonly NavSubGroupConfig[] = [];

const designLayoutEntityLink = (kind: string, entityName: string) => ({
  id: `design-layout-${kind}-${entityName}`,
  label: entityName,
  to: `/settings/design-layout/${kind}/${entityName}`,
  matchPath: `/settings/design-layout/${kind}/${entityName}`,
  icon: Database,
});

const DESIGN_LAYOUT_SUBGROUPS_FIXTURE: readonly NavSubGroupConfig[] = [
  {
    id: "design-layout-main",
    labelKey: "designLayoutMain",
    children: [
      designLayoutEntityLink("main", "testItem"),
      designLayoutEntityLink("main", "widget"),
    ],
  },
  {
    id: "design-layout-list",
    labelKey: "designLayoutList",
    children: [
      designLayoutEntityLink("list", "testItem"),
      designLayoutEntityLink("list", "widget"),
    ],
  },
  {
    id: "design-layout-detail",
    labelKey: "designLayoutDetail",
    children: [
      designLayoutEntityLink("detail", "testItem"),
      designLayoutEntityLink("detail", "widget"),
    ],
  },
  {
    id: "design-layout-forms",
    labelKey: "designLayoutForms",
    children: [
      designLayoutEntityLink("forms", "testItem"),
      designLayoutEntityLink("forms", "widget"),
    ],
  },
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

vi.mock("./design-layout-nav", () => ({
  DESIGN_LAYOUT_MATCH_PATH: "/settings/design-layout",
  useDesignLayoutNavSubGroups: () => mockDesignLayoutSubGroups,
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
    mockDesignLayoutSubGroups = [];
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
    mockDesignLayoutSubGroups = [];
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      isSuperAdmin: false,
      permissions: ["widget.read"],
    });

    const { result } = renderHook(() => useAccessibleNavItems());

    expect(getDataModelEntityIds(result.current)).toEqual(["widget"]);
  });

  it("puts model builder in data structure and automation in settings", () => {
    mockDesignLayoutSubGroups = [];
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
      ...defaultAuth,
      isSuperAdmin: false,
      permissions: ["entityDefinition.read", "hook.read"],
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
          (child) => child.id === "data-model-builder",
        ),
      ).toBe(true);
      expect(
        dataStructure.children.some(
          (child) => child.id === "entity-categories",
        ),
      ).toBe(false);
    }

    expect(settings && isNavGroup(settings)).toBe(true);
    if (settings && isNavGroup(settings)) {
      expect(
        settings.children.some((child) => child.id === "data-model-builder"),
      ).toBe(false);
      expect(settings.children.some((child) => child.id === "automation")).toBe(
        true,
      );
    }
  });

  it("puts metrics in analytics group, not settings", () => {
    mockDesignLayoutSubGroups = [];
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
    mockDesignLayoutSubGroups = [];
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
    mockDesignLayoutSubGroups = [];
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
    mockDesignLayoutSubGroups = [];
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
    mockDesignLayoutSubGroups = DESIGN_LAYOUT_SUBGROUPS_FIXTURE;
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
      expect(designLayout.children.length).toBe(4);
      const listSubgroup = designLayout.children.find(
        (child) => child.id === "design-layout-list",
      );
      expect(listSubgroup && isNavSubGroup(listSubgroup)).toBe(true);
      if (listSubgroup && isNavSubGroup(listSubgroup)) {
        expect(listSubgroup.children.length).toBeGreaterThan(0);
        expect(
          flattenNavGroupLinks(designLayout).some((link) =>
            link.to.includes("/settings/design-layout/list/"),
          ),
        ).toBe(true);
      }
    }
  });

  it("hides design layout group without entityUiOverride.read", () => {
    mockDesignLayoutSubGroups = [];
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

  it("includes platform current tenant and appearance for superadmin", () => {
    mockDesignLayoutSubGroups = [];
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
});
