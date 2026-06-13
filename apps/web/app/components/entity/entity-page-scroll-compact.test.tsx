import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  EntityPageScrollCompactProvider,
  useEntityPageScrollCompact,
} from "./entity-page-scroll-compact";

function ScrollProbe() {
  const { isCompact, registerScrollContainer } = useEntityPageScrollCompact();

  return (
    <>
      <div data-testid="compact-state">
        {isCompact ? "compact" : "expanded"}
      </div>
      <div
        ref={registerScrollContainer}
        data-testid="scroll-container"
        style={{ height: 120, overflow: "auto" }}
      >
        <div style={{ height: 400 }}>content</div>
      </div>
    </>
  );
}

describe("EntityPageScrollCompactProvider", () => {
  const listeners = new Map<
    string,
    Set<(event: MediaQueryListEvent) => void>
  >();
  let matches = true;

  beforeEach(() => {
    matches = true;
    listeners.clear();

    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
      const mediaQueryList = {
        media: query,
        matches,
        onchange: null,
        addEventListener: (
          _type: string,
          listener: (event: MediaQueryListEvent) => void,
        ) => {
          const set = listeners.get(query) ?? new Set();
          set.add(listener);
          listeners.set(query, set);
        },
        removeEventListener: (
          _type: string,
          listener: (event: MediaQueryListEvent) => void,
        ) => {
          listeners.get(query)?.delete(listener);
        },
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as MediaQueryList;

      return mediaQueryList;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enters compact mode after scrolling past the threshold on max-lg viewports", () => {
    render(
      <EntityPageScrollCompactProvider>
        <ScrollProbe />
      </EntityPageScrollCompactProvider>,
    );

    expect(screen.getByTestId("compact-state")).toHaveTextContent("expanded");

    const container = screen.getByTestId("scroll-container");
    Object.defineProperty(container, "scrollTop", {
      configurable: true,
      value: 60,
    });

    act(() => {
      fireEvent.scroll(container);
    });

    expect(screen.getByTestId("compact-state")).toHaveTextContent("compact");
  });

  it("returns to expanded mode when scrolled back near the top", () => {
    render(
      <EntityPageScrollCompactProvider>
        <ScrollProbe />
      </EntityPageScrollCompactProvider>,
    );

    const container = screen.getByTestId("scroll-container");

    Object.defineProperty(container, "scrollTop", {
      configurable: true,
      value: 60,
    });
    act(() => {
      fireEvent.scroll(container);
    });
    expect(screen.getByTestId("compact-state")).toHaveTextContent("compact");

    Object.defineProperty(container, "scrollTop", {
      configurable: true,
      value: 8,
    });
    act(() => {
      fireEvent.scroll(container);
    });

    expect(screen.getByTestId("compact-state")).toHaveTextContent("expanded");
  });

  it("does not enter compact mode on desktop-sized viewports", () => {
    matches = false;

    render(
      <EntityPageScrollCompactProvider>
        <ScrollProbe />
      </EntityPageScrollCompactProvider>,
    );

    const container = screen.getByTestId("scroll-container");
    Object.defineProperty(container, "scrollTop", {
      configurable: true,
      value: 200,
    });

    act(() => {
      fireEvent.scroll(container);
    });

    expect(screen.getByTestId("compact-state")).toHaveTextContent("expanded");
  });
});
