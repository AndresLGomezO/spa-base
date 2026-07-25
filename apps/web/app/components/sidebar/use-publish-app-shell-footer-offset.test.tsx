import { render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  APP_SHELL_FOOTER_OFFSET_CSS_VAR,
  usePublishAppShellFooterOffset,
} from "./use-publish-app-shell-footer-offset";

function FooterOffsetHarness({ enabled }: { readonly enabled: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  usePublishAppShellFooterOffset(hostRef, enabled);

  return <div ref={hostRef} data-testid="footer-host" />;
}

describe("usePublishAppShellFooterOffset", () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty(
      APP_SHELL_FOOTER_OFFSET_CSS_VAR,
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 72,
      right: 320,
      width: 320,
      height: 72,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    document.documentElement.style.removeProperty(
      APP_SHELL_FOOTER_OFFSET_CSS_VAR,
    );
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("publishes measured footer height to :root and clears on disable", () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    class MockResizeObserver {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe = (target: Element) => {
        observe(target);
        this.callback([], this as unknown as ResizeObserver);
      };
      unobserve = vi.fn();
      disconnect = disconnect;
    }
    vi.stubGlobal("ResizeObserver", MockResizeObserver);

    const { rerender, unmount } = render(<FooterOffsetHarness enabled />);

    expect(
      document.documentElement.style.getPropertyValue(
        APP_SHELL_FOOTER_OFFSET_CSS_VAR,
      ),
    ).toBe("72px");
    expect(observe).toHaveBeenCalled();

    rerender(<FooterOffsetHarness enabled={false} />);
    expect(
      document.documentElement.style.getPropertyValue(
        APP_SHELL_FOOTER_OFFSET_CSS_VAR,
      ),
    ).toBe("");

    unmount();
  });
});
