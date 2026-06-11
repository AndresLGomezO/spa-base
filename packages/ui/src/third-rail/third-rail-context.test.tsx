import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThirdRailProvider } from "./ThirdRailProvider";
import { useThirdRail } from "./useThirdRail";

function TestConsumer() {
  const { isOpen, open, close, update, options } = useThirdRail();

  return (
    <div>
      <span data-testid="open-state">{isOpen ? "open" : "closed"}</span>
      <span data-testid="title">{options?.title ?? ""}</span>
      <button
        type="button"
        onClick={() =>
          open({
            title: "Initial",
            body: <p>Body</p>,
          })
        }
      >
        Open
      </button>
      <button type="button" onClick={() => update({ title: "Updated" })}>
        Update
      </button>
      <button type="button" onClick={close}>
        Close
      </button>
    </div>
  );
}

describe("ThirdRailProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("opens and closes the third rail", () => {
    render(
      <ThirdRailProvider>
        <TestConsumer />
      </ThirdRailProvider>,
    );

    expect(screen.getByTestId("open-state")).toHaveTextContent("closed");

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByTestId("open-state")).toHaveTextContent("open");
    expect(screen.getByTestId("title")).toHaveTextContent("Initial");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByTestId("open-state")).toHaveTextContent("closed");
  });

  it("updates open options without closing", () => {
    render(
      <ThirdRailProvider>
        <TestConsumer />
      </ThirdRailProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    expect(screen.getByTestId("open-state")).toHaveTextContent("open");
    expect(screen.getByTestId("title")).toHaveTextContent("Updated");
  });

  it("calls onClose when closing", () => {
    const onClose = vi.fn();

    function ConsumerWithCallback() {
      const { open, close } = useThirdRail();

      return (
        <>
          <button
            type="button"
            onClick={() =>
              open({
                title: "Test",
                body: <p>Body</p>,
                onClose,
              })
            }
          >
            Open with callback
          </button>
          <button type="button" onClick={close}>
            Close with callback
          </button>
        </>
      );
    }

    render(
      <ThirdRailProvider>
        <ConsumerWithCallback />
      </ThirdRailProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open with callback" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Close with callback" }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("throws when useThirdRail is used outside provider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      "useThirdRail must be used within ThirdRailProvider",
    );

    consoleError.mockRestore();
  });
});
