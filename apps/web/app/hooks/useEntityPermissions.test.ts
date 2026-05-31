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
      if (permission === "widget.read") return true;
      if (permission === "widget.create") return false;
      if (permission === "widget.update") return true;
      if (permission === "widget.delete") return false;
      return false;
    });

    const { result } = renderHook(() => useEntityPermissions("widget"));

    expect(result.current).toEqual({
      canRead: true,
      canCreate: false,
      canUpdate: true,
      canDelete: false,
      canReadAll: false,
      canWriteAll: false,
      canDeleteAll: false,
      canManageShares: false,
    });
  });
});
