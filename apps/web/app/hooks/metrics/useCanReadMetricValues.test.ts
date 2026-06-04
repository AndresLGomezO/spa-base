import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  useCanReadMetricValues,
  useMetricReadAccess,
} from "./useCanReadMetricValues";

const mockUseAuth = vi.fn();

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("useMetricReadAccess", () => {
  it("returns pending while the auth session is still resolving", () => {
    mockUseAuth.mockReturnValue({
      isSessionResolved: false,
      isSuperAdmin: false,
      permissions: ["metricValue.read"],
    });

    const { result } = renderHook(() =>
      useMetricReadAccess("widget", { sourceModelResolved: true }),
    );

    expect(result.current).toBe("pending");
  });

  it("returns pending while the metric source model is not loaded yet", () => {
    mockUseAuth.mockReturnValue({
      isSessionResolved: true,
      isSuperAdmin: false,
      permissions: ["metricValue.read"],
    });

    const { result } = renderHook(() =>
      useMetricReadAccess(undefined, { sourceModelResolved: false }),
    );

    expect(result.current).toBe("pending");
  });

  it("returns allowed when metricValue.read is granted", () => {
    mockUseAuth.mockReturnValue({
      isSessionResolved: true,
      isSuperAdmin: false,
      permissions: ["metricValue.read"],
    });

    const { result } = renderHook(() =>
      useMetricReadAccess("widget", { sourceModelResolved: true }),
    );

    expect(result.current).toBe("allowed");
  });

  it("returns denied after session resolves without metric read access", () => {
    mockUseAuth.mockReturnValue({
      isSessionResolved: true,
      isSuperAdmin: false,
      permissions: [],
    });

    const { result } = renderHook(() =>
      useMetricReadAccess("widget", { sourceModelResolved: true }),
    );

    expect(result.current).toBe("denied");
  });
});

describe("useCanReadMetricValues", () => {
  it("returns false while access is still pending", () => {
    mockUseAuth.mockReturnValue({
      isSessionResolved: false,
      isSuperAdmin: false,
      permissions: ["metricValue.read"],
    });

    const { result } = renderHook(() => useCanReadMetricValues("widget"));

    expect(result.current).toBe(false);
  });
});
