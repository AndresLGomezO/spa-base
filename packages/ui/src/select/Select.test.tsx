import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Select } from "./Select";

describe("Select searchable mode", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders selected label in the trigger", () => {
    render(
      <Select searchable value="b" onChange={() => undefined}>
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </Select>,
    );

    expect(screen.getByDisplayValue("Option B")).toBeInTheDocument();
  });

  it("filters options when searching and selects a value", () => {
    const onChange = vi.fn();

    render(
      <Select searchable value="" onChange={onChange}>
        <option value="">Select…</option>
        <option value="marginTop">Margin Top</option>
        <option value="backgroundColor">Background Color</option>
      </Select>,
    );

    fireEvent.click(screen.getByDisplayValue("Select…"));
    fireEvent.change(screen.getByLabelText("Search options…"), {
      target: { value: "margin" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Margin Top" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]?.target.value).toBe("marginTop");
  });

  it("keeps native select when searchable is false", () => {
    render(
      <Select defaultValue="b">
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </Select>,
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
