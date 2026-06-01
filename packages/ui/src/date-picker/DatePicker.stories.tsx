import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { DatePicker } from "./DatePicker.js";
import type { DatePickerLabels, DatePickerMode } from "./date-picker.types.js";

const labels: DatePickerLabels = {
  placeholder: "Select date",
  clear: "Clear",
  previous: "Previous",
  next: "Next",
  am: "AM",
  pm: "PM",
  hour: "Hour",
  minute: "Minute",
  selectTime: "Select time",
};

function DatePickerDemo({ mode }: { readonly mode: DatePickerMode }) {
  const [value, setValue] = useState<string | undefined>(
    mode === "time" ? "1970-01-01T09:30:00.000Z" : "2025-03-15T14:30:00.000Z",
  );

  return (
    <div className="max-w-sm">
      <DatePicker
        mode={mode}
        value={value}
        onChange={setValue}
        labels={labels}
      />
    </div>
  );
}

const meta = {
  title: "Components/DatePicker",
  component: DatePicker,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof DatePicker>;

export default meta;

type Story = StoryObj<typeof DatePicker>;

export const DateOnly: Story = {
  render: () => <DatePickerDemo mode="date" />,
};

export const DateTime: Story = {
  render: () => <DatePickerDemo mode="datetime" />,
};

export const TimeOnly: Story = {
  render: () => <DatePickerDemo mode="time" />,
};

export const Empty: Story = {
  render: () => (
    <div className="max-w-sm">
      <DatePicker
        mode="date"
        value={undefined}
        onChange={() => undefined}
        labels={labels}
      />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="max-w-sm">
      <DatePicker
        mode="datetime"
        value="2025-03-15T14:30:00.000Z"
        onChange={() => undefined}
        disabled
        labels={labels}
      />
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="max-w-sm">
      <DatePicker
        mode="date"
        value="2025-03-15T00:00:00.000Z"
        onChange={() => undefined}
        hasError
        labels={labels}
      />
    </div>
  ),
};

export const DateTimeInModal: Story = {
  render: () => (
    <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="border-border bg-background w-full max-w-lg overflow-hidden rounded-xl border p-6 shadow-xl">
        <p className="text-muted-foreground mb-4 text-sm">
          Mock modal — datetime picker should render calendar and time side by
          side.
        </p>
        <DatePickerDemo mode="datetime" />
      </div>
    </div>
  ),
};
