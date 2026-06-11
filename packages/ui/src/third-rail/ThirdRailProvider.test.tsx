import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThirdRailHost } from "./ThirdRailHost";
import { ThirdRailProvider } from "./ThirdRailProvider";
import { useThirdRail } from "./useThirdRail";

function OpenPanel({ onClose }: { readonly onClose?: () => void | boolean }) {
  const { open } = useThirdRail();

  return (
    <button
      type="button"
      onClick={() =>
        open({
          title: "Column 1",
          body: <p>Panel body</p>,
          onClose,
        })
      }
    >
      Open panel
    </button>
  );
}

function renderProvider(onClose?: () => void | boolean) {
  return render(
    <ThirdRailProvider>
      <OpenPanel onClose={onClose} />
      <ThirdRailHost />
    </ThirdRailProvider>,
  );
}

describe("ThirdRailProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("closes when onClose does not return false", () => {
    const onClose = vi.fn();

    renderProvider(onClose);

    fireEvent.click(screen.getByRole("button", { name: "Open panel" }));
    expect(screen.getByRole("complementary")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("keeps the rail open when onClose returns false", () => {
    const onClose = vi.fn(() => false);

    renderProvider(onClose);

    fireEvent.click(screen.getByRole("button", { name: "Open panel" }));
    expect(screen.getByRole("complementary")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });
});
