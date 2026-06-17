import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
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

vi.mock("../forms/FormModal", () => ({
  FormModal: ({
    open,
    title,
    children,
  }: {
    readonly open: boolean;
    readonly title: string;
    readonly children: ReactNode;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
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
    return screen.findByRole("dialog");
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
      const dialog = await openCustomizeModal();

      expect(
        within(dialog).getByRole("button", {
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
      const dialog = await openCustomizeModal();

      expect(
        within(dialog).getByRole("combobox", {
          name: "platform.appearance.preset",
        }),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByLabelText("--color-primary"),
      ).toBeInTheDocument();
      expect(within(dialog).getByLabelText("--color-card")).toBeInTheDocument();
    },
    MODAL_TEST_TIMEOUT_MS,
  );

  it(
    "opens the theme JSON view dialog from the customize modal",
    async () => {
      renderEditor();
      const dialog = await openCustomizeModal();

      fireEvent.click(
        within(dialog).getByRole("button", {
          name: "platform.appearance.themeJson.viewTrigger",
        }),
      );

      expect(
        await screen.findByText(
          "platform.appearance.themeJson.viewDescription",
        ),
      ).toBeInTheDocument();
    },
    MODAL_TEST_TIMEOUT_MS,
  );

  it(
    "opens the theme JSON import dialog from the customize modal",
    async () => {
      renderEditor();
      const dialog = await openCustomizeModal();

      fireEvent.click(
        within(dialog).getByRole("button", {
          name: "platform.appearance.themeJson.importTrigger",
        }),
      );

      expect(
        await screen.findByText(
          "platform.appearance.themeJson.importDescription",
        ),
      ).toBeInTheDocument();
    },
    MODAL_TEST_TIMEOUT_MS,
  );
});
