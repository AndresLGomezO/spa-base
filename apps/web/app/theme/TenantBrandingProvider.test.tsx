import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TenantBrandingProvider } from "./TenantBrandingProvider";

const useAuthMock = vi.fn();
const useColorSchemeMock = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@repo/theme/react", () => ({
  useColorScheme: () => useColorSchemeMock(),
}));

describe("TenantBrandingProvider", () => {
  it("clears tenant CSS variables including legacy --spacing when logged out", () => {
    useColorSchemeMock.mockReturnValue({ colorScheme: "light" });
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isSessionResolved: false,
      tenantAppearance: null,
      tenantId: null,
    });

    const root = document.documentElement;
    root.style.setProperty("--spacing", "1.5rem");

    render(
      <TenantBrandingProvider>
        <div>Login</div>
      </TenantBrandingProvider>,
    );

    expect(root.style.getPropertyValue("--spacing")).toBe("");
  });
});
