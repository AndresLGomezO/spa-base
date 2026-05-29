import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HomePage } from "./home-page";

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      uid: "123",
      email: "person@example.com",
      displayName: "Test User",
      photoURL: null,
      role: "member",
      providerId: "password",
    },
    permissions: [],
    isSuperAdmin: false,
    logout: vi.fn(),
  }),
}));

describe("HomePage", () => {
  it("renders the authenticated home page", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(
      screen.getByText("Authenticated session active."),
    ).toBeInTheDocument();
  });
});
