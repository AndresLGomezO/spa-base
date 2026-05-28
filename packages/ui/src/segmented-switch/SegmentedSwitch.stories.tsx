import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { MoonIcon } from "../icons/MoonIcon";
import { SunIcon } from "../icons/SunIcon";
import { SegmentedSwitch } from "./SegmentedSwitch";

const meta = {
  title: "Components/SegmentedSwitch",
  component: SegmentedSwitch,
  tags: ["autodocs"],
} satisfies Meta<typeof SegmentedSwitch>;

export default meta;

function ThemeSwitchDemo() {
  const [value, setValue] = useState<"light" | "dark">("light");

  return (
    <SegmentedSwitch
      value={value}
      onChange={setValue}
      ariaLabel="Theme"
      fullWidth
      options={[
        {
          value: "light",
          ariaLabel: "Light mode",
          label: (
            <>
              <SunIcon />
              <span>Light</span>
            </>
          ),
        },
        {
          value: "dark",
          ariaLabel: "Dark mode",
          label: (
            <>
              <MoonIcon />
              <span>Dark</span>
            </>
          ),
        },
      ]}
    />
  );
}

export const Theme: StoryObj = {
  render: () => <ThemeSwitchDemo />,
};

function LanguageSwitchDemo() {
  const [value, setValue] = useState<"en" | "es">("en");

  return (
    <SegmentedSwitch
      value={value}
      onChange={setValue}
      ariaLabel="Language"
      fullWidth
      options={[
        { value: "en", ariaLabel: "English", label: "EN" },
        { value: "es", ariaLabel: "Español", label: "ES" },
      ]}
    />
  );
}

export const Language: StoryObj = {
  render: () => <LanguageSwitchDemo />,
};
