import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

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

function MonthYearPickerDemo({
  withPresets = false,
}: {
  readonly withPresets?: boolean;
}) {
  const [value, setValue] = useState("2026-07");

  return (
    <div className="max-w-sm">
      <MonthYearPicker
        value={value}
        onChange={setValue}
        labels={labels}
        showClearButton={value !== "2026-07"}
        onClear={() => setValue("2026-07")}
        presets={
          withPresets
            ? [
                { label: "This month", value: "2026-07" },
                { label: "Last month", value: "2026-06" },
              ]
            : undefined
        }
      />
    </div>
  );
}

const meta = {
  title: "Components/MonthYearPicker",
  component: MonthYearPicker,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof MonthYearPicker>;

export default meta;

type Story = StoryObj<typeof MonthYearPicker>;

export const Default: Story = {
  render: () => <MonthYearPickerDemo />,
};

export const WithPresets: Story = {
  render: () => <MonthYearPickerDemo withPresets />,
};

export const MobileWithPresets: Story = {
  render: () => <MonthYearPickerDemo withPresets />,
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
