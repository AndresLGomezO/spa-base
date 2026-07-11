/** @vitest-environment jsdom */

import { createElement, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { MotionPressHost } from "./MotionPressHost.js";

beforeAll(() => {
  if (typeof globalThis.PointerEvent === "undefined") {
    class PointerEventPolyfill extends MouseEvent {
      constructor(type: string, params: MouseEventInit = {}) {
        super(type, params);
      }
    }
    globalThis.PointerEvent =
      PointerEventPolyfill as unknown as typeof PointerEvent;
  }
});

const mounts: HTMLElement[] = [];

afterEach(() => {
  for (const node of mounts.splice(0)) {
    node.remove();
  }
  vi.useRealTimers();
});

function mount(element: ReactElement): HTMLElement {
  const host = document.createElement("div");
  document.body.appendChild(host);
  mounts.push(host);
  const root = createRoot(host);
  act(() => {
    root.render(element);
  });
  return host;
}

describe("MotionPressHost", () => {
  it("creates a ripple ink span on pointerdown and removes it after duration", () => {
    vi.useFakeTimers();
    const container = mount(
      createElement(
        MotionPressHost,
        {
          press: "ripple",
          pressDurationMs: 600,
          id: "press-host",
          className: "ui-motion-press ui-motion-press-ripple",
          style: { width: 80, height: 80 },
        },
        "Tap",
      ),
    );

    const host = container.querySelector("#press-host") as HTMLElement;
    Object.defineProperty(host, "getBoundingClientRect", {
      value: () => ({
        left: 10,
        top: 20,
        width: 80,
        height: 80,
        right: 90,
        bottom: 100,
        x: 10,
        y: 20,
        toJSON: () => ({}),
      }),
    });

    act(() => {
      host.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          clientX: 50,
          clientY: 60,
        }),
      );
    });

    const ink = host.querySelector(
      ".ui-motion-press-ripple-ink",
    ) as HTMLElement;
    expect(ink).not.toBeNull();
    expect(ink.style.width).toBe("80px");
    expect(ink.style.height).toBe("80px");

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(host.querySelector(".ui-motion-press-ripple-ink")).toBeNull();
  });

  it("renders wave flash overlay for wave press", () => {
    const container = mount(
      createElement(
        MotionPressHost,
        {
          press: "wave",
          id: "wave-host",
          className: "ui-motion-press ui-motion-press-wave",
        },
        "Wave",
      ),
    );

    const host = container.querySelector("#wave-host")!;
    expect(host.querySelector(".ui-motion-press-wave-flash")).not.toBeNull();
  });

  it("renders slide sheen overlay for slide press", () => {
    const container = mount(
      createElement(
        MotionPressHost,
        {
          press: "slide",
          id: "slide-host",
          className: "ui-motion-press ui-motion-press-slide",
        },
        "Slide",
      ),
    );

    const host = container.querySelector("#slide-host")!;
    expect(host.querySelector(".ui-motion-press-slide-sheen")).not.toBeNull();
  });

  it("passes through without overlays for glow", () => {
    const container = mount(
      createElement(
        MotionPressHost,
        {
          press: "glow",
          id: "glow-host",
          className: "ui-motion-press ui-motion-press-glow",
        },
        "Glow",
      ),
    );

    const host = container.querySelector("#glow-host")!;
    expect(host.querySelector(".ui-motion-press-wave-flash")).toBeNull();
    expect(host.querySelector(".ui-motion-press-slide-sheen")).toBeNull();

    act(() => {
      host.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    expect(host.querySelector(".ui-motion-press-ripple-ink")).toBeNull();
  });
});
