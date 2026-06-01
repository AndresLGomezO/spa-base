import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { isNavGroup } from "../components/sidebar/nav-config";
import type { EntityCatalogEntry } from "../entities/entity-catalog";
import { MOCK_ENTITY_CATALOG } from "../test/entity-catalog-fixtures";
import { useAccessibleNavItems } from "./useAccessibleNavItems";

const mockUseAuth = vi.fn();
let mockCatalogItems: readonly EntityCatalogEntry[] = MOCK_ENTITY_CATALOG;

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

function getDataModelEntityIds(
  items: ReturnType<typeof useAccessibleNavItems>,
): string[] {
  const dataModels = items.find((item) => item.id === "data-models");
  if (dataModels && isNavGroup(dataModels)) {
    return dataModels.children.map((child) => child.id);
  }
  return [];
}

describe("useAccessibleNavItems", () => {
  it("shows all entities for superadmin", () => {
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
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
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
      isSuperAdmin: false,
      permissions: ["widget.read"],
    });

    const { result } = renderHook(() => useAccessibleNavItems());

    expect(getDataModelEntityIds(result.current)).toEqual(["widget"]);
  });

  it("includes settings nav for tenant admins without profile or billing", () => {
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
      isSuperAdmin: false,
      permissions: ["entityDefinition.read", "hook.read"],
    });

    const { result } = renderHook(() => useAccessibleNavItems());
    const settings = result.current.find((item) => item.id === "settings");
    expect(settings && isNavGroup(settings)).toBe(true);
    if (settings && isNavGroup(settings)) {
      expect(settings.children.some((child) => child.id === "profile")).toBe(
        false,
      );
      expect(settings.children.some((child) => child.id === "billing")).toBe(
        false,
      );
      expect(settings.children.some((child) => child.id === "automation")).toBe(
        true,
      );
    }
  });

  it("groups categorized entities separately from uncategorized data models", () => {
    mockCatalogItems = [
      {
        ...MOCK_ENTITY_CATALOG[0],
        navCategoryId: "cat_sales",
        navOrder: 1,
      },
      MOCK_ENTITY_CATALOG[1],
    ];

    mockUseAuth.mockReturnValue({
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

  it("includes platform current tenant and appearance for superadmin", () => {
    mockCatalogItems = MOCK_ENTITY_CATALOG;
    mockUseAuth.mockReturnValue({
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
