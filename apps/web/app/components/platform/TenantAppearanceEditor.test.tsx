import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@repo/theme/react";

import { TenantAppearanceEditor } from "./TenantAppearanceEditor";

function renderEditor() {
  return render(
    <ThemeProvider defaultColorScheme="light">
      <TenantAppearanceEditor tenantId="tenant_a" />
    </ThemeProvider>,
  );
}

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    selectTenant: vi.fn(),
  }),
}));

vi.mock("../../lib/admin-client", () => ({
  getAdminTenant: vi.fn(),
  updateAdminTenant: vi.fn(),
  uploadTenantLogo: vi.fn(),
}));

vi.mock("@repo/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/ui")>();
  return {
    ...actual,
    PhotoUpload: ({
      labels,
      onUpload,
    }: {
      readonly labels?: { readonly select?: string };
      readonly onUpload: (params: {
        readonly file: File;
        readonly uploadId: string;
      }) => void | Promise<void>;
    }) => (
      <button
        type="button"
        onClick={() =>
          void onUpload({
            file: new File(["x"], "logo.jpg", { type: "image/jpeg" }),
            uploadId: "upload-123",
          })
        }
      >
        {labels?.select ?? "Select photo"}
      </button>
    ),
  };
});

import { getAdminTenant } from "../../lib/admin-client";

describe("TenantAppearanceEditor", () => {
  beforeEach(() => {
    vi.mocked(getAdminTenant).mockResolvedValue({
      id: "tenant_a",
      name: "Tenant A",
      status: "active",
      createdBy: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      appearance: {
        logoUrl: "https://example.com/logo.png",
      },
    });
  });

  it("renders PhotoUpload with logo labels after tenant loads", async () => {
    renderEditor();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "platform.appearance.photoSelect" }),
      ).toBeInTheDocument();
    });
  });

  it("renders theme preset and semantic token fields", async () => {
    renderEditor();

    await waitFor(() => {
      expect(
        screen.getByLabelText("platform.appearance.preset"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("platform.appearance.semantics"),
    ).toBeInTheDocument();
    expect(document.getElementById("--color-primary-hex")).toBeInTheDocument();
    expect(document.getElementById("--color-card-hex")).toBeInTheDocument();
  });
});
