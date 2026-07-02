import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { NavigationPendingOutlet } from "./NavigationPendingOutlet";

vi.mock("../components/loading/EntityPageSkeleton", () => ({
  EntityPageSkeleton: () => <div data-testid="route-skeleton">Loading</div>,
}));

const useNavigationMock = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigation: () => useNavigationMock(),
  };
});

describe("NavigationPendingOutlet", () => {
  it("renders a skeleton while navigation is loading", () => {
    useNavigationMock.mockReturnValue({ state: "loading" });

    render(
      <MemoryRouter>
        <NavigationPendingOutlet />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("route-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("outlet-content")).not.toBeInTheDocument();
  });

  it("renders the outlet when navigation is idle", () => {
    useNavigationMock.mockReturnValue({ state: "idle" });

    render(
      <MemoryRouter>
        <NavigationPendingOutlet />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("route-skeleton")).not.toBeInTheDocument();
  });
});
