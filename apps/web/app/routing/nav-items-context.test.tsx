import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HOME_NAV_ITEM } from "../components/sidebar/nav-config";
import { NavItemsProvider, useNavItems } from "./nav-items-context";

vi.mock("./useAccessibleNavItems", () => ({
  useAccessibleNavItems: () => [HOME_NAV_ITEM],
}));

describe("NavItemsProvider", () => {
  it("exposes nav items and pre-sorted flat links", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NavItemsProvider>{children}</NavItemsProvider>
    );

    const { result } = renderHook(() => useNavItems(), { wrapper });

    expect(result.current.navItems).toHaveLength(1);
    expect(result.current.flatLinks).toEqual([HOME_NAV_ITEM]);
  });
});
