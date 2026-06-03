import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { useIntersectionVisibility } from "./useIntersectionVisibility";

type ObserverCallback = IntersectionObserverCallback;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  readonly unobserve = vi.fn();

  constructor(
    private readonly callback: ObserverCallback,
    _options?: IntersectionObserverInit,
  ) {
    void _options;
    MockIntersectionObserver.instances.push(this);
  }

  trigger(isIntersecting: boolean): void {
    this.callback(
      [
        {
          isIntersecting,
          intersectionRatio: isIntersecting ? 1 : 0,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

function VisibilityProbe({ enabled }: { readonly enabled: boolean }) {
  const { ref, isVisible } = useIntersectionVisibility({ enabled });
  return <div ref={ref} data-testid="probe" data-visible={String(isVisible)} />;
}

describe("useIntersectionVisibility", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts visible when disabled without observing", () => {
    render(<VisibilityProbe enabled={false} />);
    expect(screen.getByTestId("probe")).toHaveAttribute("data-visible", "true");
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("updates isVisible when intersection changes", () => {
    render(<VisibilityProbe enabled={true} />);

    const observer = MockIntersectionObserver.instances[0];
    expect(observer).toBeDefined();
    expect(observer.observe).toHaveBeenCalled();

    act(() => {
      observer.trigger(false);
    });
    expect(screen.getByTestId("probe")).toHaveAttribute(
      "data-visible",
      "false",
    );

    act(() => {
      observer.trigger(true);
    });
    expect(screen.getByTestId("probe")).toHaveAttribute("data-visible", "true");
  });
});
