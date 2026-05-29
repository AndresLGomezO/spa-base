import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useEntityPermissions } from "./useEntityPermissions";

vi.mock("../auth/usePermission", () => ({
  usePermission: vi.fn((permission: string) => permission.endsWith(".read")),
}));

import { usePermission } from "../auth/usePermission";

describe("useEntityPermissions", () => {
  it("maps entity permission strings to CRUD flags", () => {
    vi.mocked(usePermission).mockImplementation((permission) => {
      if (permission === "customer.read") return true;
      if (permission === "customer.create") return false;
      if (permission === "customer.update") return true;
      if (permission === "customer.delete") return false;
      return false;
    });

    const { result } = renderHook(() => useEntityPermissions("customer"));

    expect(result.current).toEqual({
      canRead: true,
      canCreate: false,
      canUpdate: true,
      canDelete: false,
    });
  });
});
