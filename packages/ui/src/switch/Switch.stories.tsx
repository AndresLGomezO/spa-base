import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { Switch, type SwitchVariant } from "./Switch";

const meta = {
  title: "Components/Switch",
  component: Switch,
  tags: ["autodocs"],
} satisfies Meta<typeof Switch>;

export default meta;

type Story = StoryObj<typeof Switch>;

function SwitchDemo({
  variant,
  width,
  height,
}: {
  readonly variant: SwitchVariant;
  readonly width?: number;
  readonly height?: number;
}) {
  const [checked, setChecked] = useState(false);

  return (
    <Switch
      id="switch-demo"
      label="Enable notifications"
      checked={checked}
      onChange={setChecked}
      variant={variant}
      width={width}
      height={height}
    />
  );
}

export const Ios: Story = {
  render: () => <SwitchDemo variant="ios" />,
};

function SquaredSwitchDemo() {
  const [checked, setChecked] = useState(false);

  return (
    <div className="max-w-xs">
      <Switch
        id="switch-squared"
        checked={checked}
        onChange={setChecked}
        variant="squared"
        trueLabel="Yes"
        falseLabel="No"
      />
    </div>
  );
}

export const Squared: Story = {
  render: () => <SquaredSwitchDemo />,
};

export const CustomSize: Story = {
  render: () => <SwitchDemo variant="ios" width={64} height={32} />,
};

export const Disabled: Story = {
  render: () => (
    <Switch
      id="switch-disabled"
      label="Disabled switch"
      checked
      disabled
      onChange={() => undefined}
      variant="ios"
    />
  ),
};
