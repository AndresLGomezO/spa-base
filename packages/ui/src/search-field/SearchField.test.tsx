import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SearchField } from "./SearchField";

describe("SearchField", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("accepts spaces between words while typing", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();

    render(
      <SearchField
        value=""
        onChange={onChange}
        placeholder="Search"
        debounceMs={300}
      />,
    );

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "outflow category" },
    });

    expect(screen.getByRole("searchbox")).toHaveValue("outflow category");

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onChange).toHaveBeenCalledWith("outflow category");
  });

  it("does not overwrite in-progress input while focused", () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <SearchField
        value=""
        onChange={onChange}
        placeholder="Search"
        debounceMs={300}
      />,
    );

    const input = screen.getByRole("searchbox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "outflo " } });

    rerender(
      <SearchField
        value="outflo"
        onChange={onChange}
        placeholder="Search"
        debounceMs={300}
      />,
    );

    expect(input).toHaveValue("outflo ");
  });

  it("reconciles to external value on blur", () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <SearchField
        value="outflow"
        onChange={onChange}
        placeholder="Search"
        debounceMs={300}
      />,
    );

    const input = screen.getByRole("searchbox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "outflow draft" } });

    rerender(
      <SearchField
        value=""
        onChange={onChange}
        placeholder="Search"
        debounceMs={300}
      />,
    );

    expect(input).toHaveValue("outflow draft");

    fireEvent.blur(input);

    expect(input).toHaveValue("");
  });
});
