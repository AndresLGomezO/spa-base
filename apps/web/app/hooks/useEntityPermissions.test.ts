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
      if (permission === "organization.read") return true;
      if (permission === "organization.create") return false;
      if (permission === "organization.update") return true;
      if (permission === "organization.delete") return false;
      return false;
    });

    const { result } = renderHook(() => useEntityPermissions("organization"));

    expect(result.current).toEqual({
      canRead: true,
      canCreate: false,
      canUpdate: true,
      canDelete: false,
    });
  });
});
