import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import "./app/i18n";

vi.mock("./app/hooks/useTenantIndexReadiness", () => ({
  useTenantIndexReadiness: () => ({
    isEnvironmentReady: true,
    phase: "ready",
    buildingCollections: [],
    errorCollections: [],
    collections: [],
    totalCreatingCount: 0,
    isLoading: false,
    isError: false,
  }),
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    media: query,
    matches: false,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

afterEach(() => {
  cleanup();
});
