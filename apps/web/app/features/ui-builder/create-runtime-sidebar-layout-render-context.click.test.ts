import { describe, expect, it } from "vitest";

import { createRuntimeAppShellChromeRenderContext } from "./create-runtime-sidebar-layout-render-context.js";

describe("createRuntimeAppShellChromeRenderContext click actions", () => {
  it("resolves externalUrl click targets for footer containers", () => {
    const context = createRuntimeAppShellChromeRenderContext({
      locale: "en",
      t: ((key: string) => key) as never,
      activePathname: "/",
    });

    expect(context.resolveComponentClickTarget).toBeTypeOf("function");
    expect(context.componentClickWrapper).toBeTypeOf("function");

    const home = context.resolveComponentClickTarget?.(
      {
        type: "externalUrl",
        url: { type: "static", value: "/" },
        openInNewTab: false,
      },
      {},
    );
    expect(home).toEqual({
      kind: "link",
      href: "/",
      external: false,
      openInNewTab: false,
    });

    const entityPath = context.resolveComponentClickTarget?.(
      {
        type: "externalUrl",
        url: { type: "static", value: "/app/transaction" },
        openInNewTab: false,
      },
      {},
    );
    expect(entityPath).toMatchObject({
      kind: "link",
      href: "/app/transaction",
      external: false,
    });
  });
});
