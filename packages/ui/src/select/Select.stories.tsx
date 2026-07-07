import type { Meta, StoryObj } from "@storybook/react";

import { Select } from "./Select";

const meta = {
  title: "Components/Select",
  component: Select,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select defaultValue="b">
      <option value="">Select…</option>
      <option value="a">Option A</option>
      <option value="b">Option B</option>
      <option value="c">Option C</option>
    </Select>
  ),
};

export const Small: Story = {
  render: () => (
    <Select selectSize="sm" defaultValue="b">
      <option value="">Select…</option>
      <option value="a">Option A</option>
      <option value="b">Option B</option>
    </Select>
  ),
};

export const WithGroups: Story = {
  render: () => (
    <Select defaultValue="">
      <option value="">Choose device…</option>
      <optgroup label="Apple">
        <option value="iphone">iPhone</option>
        <option value="ipad">iPad</option>
      </optgroup>
      <optgroup label="Google">
        <option value="pixel">Pixel</option>
      </optgroup>
    </Select>
  ),
};

export const Searchable: Story = {
  render: () => (
    <Select searchable defaultValue="marginTop">
      <option value="marginTop">Margin Top</option>
      <option value="marginBottom">Margin Bottom</option>
      <option value="backgroundColor">Background Color</option>
      <option value="fontSize">Font Size</option>
    </Select>
  ),
};

export const SearchableWithGroups: Story = {
  render: () => (
    <Select searchable defaultValue="">
      <option value="">Choose device…</option>
      <optgroup label="Apple">
        <option value="iphone">iPhone</option>
        <option value="ipad">iPad</option>
      </optgroup>
      <optgroup label="Google">
        <option value="pixel">Pixel</option>
      </optgroup>
    </Select>
  ),
};

export const SearchableSmall: Story = {
  render: () => (
    <Select searchable selectSize="sm" defaultValue="a">
      <option value="a">Option A</option>
      <option value="b">Option B</option>
      <option value="c">Option C</option>
    </Select>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Select multiple className="min-h-28" defaultValue={["a", "c"]}>
      <option value="a">Option A</option>
      <option value="b">Option B</option>
      <option value="c">Option C</option>
    </Select>
  ),
};
