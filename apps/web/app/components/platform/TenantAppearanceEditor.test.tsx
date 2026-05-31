import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@repo/theme/react";

import { TenantAppearanceEditor } from "./TenantAppearanceEditor";

const MODAL_TEST_TIMEOUT_MS = 15_000;

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

vi.mock("./ColorPaletteEditor", () => ({
  ColorPaletteEditor: () => null,
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

  async function openCustomizeModal() {
    fireEvent.click(
      await screen.findByRole("button", {
        name: "platform.appearance.customize",
      }),
    );
    await screen.findByRole("dialog");
  }

  it("renders customize control after tenant loads", async () => {
    renderEditor();

    expect(
      await screen.findByRole("button", {
        name: "platform.appearance.customize",
      }),
    ).toBeInTheDocument();
  });

  it(
    "renders PhotoUpload with logo labels inside the customize modal",
    async () => {
      renderEditor();
      await openCustomizeModal();

      expect(
        await screen.findByRole("button", {
          name: "platform.appearance.photoSelect",
        }),
      ).toBeInTheDocument();
    },
    MODAL_TEST_TIMEOUT_MS,
  );

  it(
    "renders theme preset and semantic token fields inside the customize modal",
    async () => {
      renderEditor();
      await openCustomizeModal();

      expect(
        await screen.findByRole("combobox", {
          name: "platform.appearance.preset",
        }),
      ).toBeInTheDocument();

      expect(
        await screen.findByText("platform.appearance.semantics"),
      ).toBeInTheDocument();
      expect(
        document.getElementById("--color-primary-hex"),
      ).toBeInTheDocument();
      expect(document.getElementById("--color-card-hex")).toBeInTheDocument();
    },
    MODAL_TEST_TIMEOUT_MS,
  );
});
