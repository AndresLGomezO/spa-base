import { describe, expect, it, vi } from "vitest";

import { handleComponentClickTarget } from "./handle-component-click-target.js";

describe("handleComponentClickTarget", () => {
  it("opens entity form modal for modal targets", () => {
    const openEntityFormModal = vi.fn();

    handleComponentClickTarget(
      {
        kind: "entityFormModal",
        entityName: "transaction",
        mode: "create",
        createPrefill: { accountId: "account-1" },
      },
      { openEntityFormModal },
    );

    expect(openEntityFormModal).toHaveBeenCalledWith({
      entityName: "transaction",
      mode: "create",
      createPrefill: { accountId: "account-1" },
    });
  });

  it("navigates for internal link targets", () => {
    const navigate = vi.fn();
    const openEntityFormModal = vi.fn();

    handleComponentClickTarget(
      {
        kind: "link",
        href: "/app/order/order-1",
        external: false,
        state: { returnTo: "/app/order" },
      },
      { navigate, openEntityFormModal },
    );

    expect(navigate).toHaveBeenCalledWith("/app/order/order-1", {
      state: { returnTo: "/app/order" },
    });
    expect(openEntityFormModal).not.toHaveBeenCalled();
  });
});
