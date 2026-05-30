import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { isNavGroup } from "../components/sidebar/nav-config";
import { MOCK_ENTITY_CATALOG } from "../test/entity-catalog-fixtures";
import { useAccessibleNavItems } from "./useAccessibleNavItems";

const mockUseAuth = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../entities/entity-catalog-context", () => ({
  useEntityCatalog: () => ({
    items: MOCK_ENTITY_CATALOG,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    getDefinition: vi.fn(),
    isKnownEntity: vi.fn(),
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
    mockUseAuth.mockReturnValue({
      isSuperAdmin: true,
      permissions: [],
    });

    const { result } = renderHook(() => useAccessibleNavItems());

    expect(getDataModelEntityIds(result.current)).toEqual([
      "widget",
      "testItem",
    ]);
  });

  it("filters entities by read permission for viewers", () => {
    mockUseAuth.mockReturnValue({
      isSuperAdmin: false,
      permissions: ["widget.read"],
    });

    const { result } = renderHook(() => useAccessibleNavItems());

    expect(getDataModelEntityIds(result.current)).toEqual(["widget"]);
  });

  it("includes settings nav for tenant admins without profile or billing", () => {
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

  it("includes platform current tenant and appearance for superadmin", () => {
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
