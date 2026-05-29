import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../button/Button";
import { Checkbox } from "../checkbox/Checkbox";
import { FieldError } from "../field/FieldError";
import { FieldLabel } from "../field/FieldLabel";
import { Input } from "../input/Input";
import { Form } from "./Form";

const meta = {
  title: "Components/Form",
  component: Form,
  tags: ["autodocs"],
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: null,
  },
  render: () => (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor="name" required>
          Name
        </FieldLabel>
        <Input id="name" name="name" placeholder="Jane Doe" />
      </div>
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" name="email" type="email" hasError />
        <FieldError>Enter a valid email address.</FieldError>
      </div>
      <Checkbox id="active" name="active" label="Active" defaultChecked />
      <Button type="submit">Save</Button>
    </Form>
  ),
};
