import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MonthYearPicker } from "./MonthYearPicker.js";
import type { DatePickerLabels } from "./date-picker.types.js";

const labels: DatePickerLabels = {
  placeholder: "Select month",
  clear: "Clear",
  previous: "Previous",
  next: "Next",
  selectMonth: "Select month",
  selectYear: "Select year",
  openCalendar: "Open month picker",
};

vi.mock("../hooks/usePreferNativePickers.js", () => ({
  usePreferNativePickers: vi.fn(() => false),
  MOBILE_BREAKPOINT: 768,
}));

import { usePreferNativePickers } from "../hooks/usePreferNativePickers.js";

const preferNative = vi.mocked(usePreferNativePickers);

describe("MonthYearPicker", () => {
  afterEach(() => {
    cleanup();
    preferNative.mockReturnValue(false);
  });

  it("opens a bottom sheet with presets on narrow/touch preference", () => {
    preferNative.mockReturnValue(true);
    const onChange = vi.fn();

    render(
      <MonthYearPicker
        value="2026-07"
        onChange={onChange}
        labels={labels}
        presets={[
          { label: "This month", value: "2026-07" },
          { label: "Last month", value: "2026-06" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open month picker" }));

    expect(
      screen.getByRole("dialog", { name: "Select month" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "This month" })).toHaveClass(
      "min-h-11",
    );
    expect(
      screen.getByRole("button", { name: "Last month" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Last month" }));

    expect(onChange).toHaveBeenCalledWith("2026-06");
  });

  it("keeps desktop popover when sheet preference is off", () => {
    preferNative.mockReturnValue(false);

    render(
      <MonthYearPicker
        value="2026-07"
        onChange={() => undefined}
        labels={labels}
        presets={[{ label: "This month", value: "2026-07" }]}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Open month picker" }),
    ).toBeNull();

    fireEvent.click(screen.getByDisplayValue("July 2026"));

    expect(
      screen.getByRole("button", { name: "This month" }),
    ).toBeInTheDocument();
  });
});
