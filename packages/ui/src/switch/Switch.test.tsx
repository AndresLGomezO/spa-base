import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Switch } from "./Switch";

describe("Switch", () => {
  afterEach(() => {
    cleanup();
  });

  describe("ios variant", () => {
    it("renders with switch role and reflects checked state", () => {
      const onChange = vi.fn();

      render(
        <Switch
          id="test-switch"
          label="Active"
          checked={false}
          onChange={onChange}
        />,
      );

      const control = screen.getByRole("switch", { name: "Active" });
      expect(control).toHaveAttribute("aria-checked", "false");
    });

    it("calls onChange when clicked", () => {
      const onChange = vi.fn();

      render(
        <Switch
          id="test-switch"
          label="Active"
          checked={false}
          onChange={onChange}
        />,
      );

      fireEvent.click(screen.getByRole("switch"));
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it("toggles on Space key", () => {
      const onChange = vi.fn();

      render(
        <Switch
          id="test-switch"
          label="Active"
          checked={false}
          onChange={onChange}
        />,
      );

      fireEvent.keyDown(screen.getByRole("switch"), { key: " " });
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it("does not call onChange when disabled", () => {
      const onChange = vi.fn();

      render(
        <Switch
          id="test-switch"
          label="Active"
          checked={false}
          disabled
          onChange={onChange}
        />,
      );

      fireEvent.click(screen.getByRole("switch"));
      expect(onChange).not.toHaveBeenCalled();
    });

    it("applies custom width and height", () => {
      render(
        <Switch
          id="test-switch"
          checked
          onChange={vi.fn()}
          width={64}
          height={32}
        />,
      );

      expect(screen.getByRole("switch")).toHaveStyle({
        width: "64px",
        height: "32px",
      });
    });
  });

  describe("squared variant", () => {
    it("renders Yes/No radio options with selected state", () => {
      render(
        <Switch
          checked={false}
          onChange={vi.fn()}
          variant="squared"
          trueLabel="Yes"
          falseLabel="No"
        />,
      );

      expect(screen.getByRole("radio", { name: "Yes" })).toHaveAttribute(
        "aria-checked",
        "false",
      );
      expect(screen.getByRole("radio", { name: "No" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });

    it("calls onChange with true when Yes is selected", () => {
      const onChange = vi.fn();

      render(
        <Switch
          checked={false}
          onChange={onChange}
          variant="squared"
          trueLabel="Yes"
          falseLabel="No"
        />,
      );

      fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it("calls onChange with false when No is selected", () => {
      const onChange = vi.fn();

      render(
        <Switch
          checked
          onChange={onChange}
          variant="squared"
          trueLabel="Yes"
          falseLabel="No"
        />,
      );

      fireEvent.click(screen.getByRole("radio", { name: "No" }));
      expect(onChange).toHaveBeenCalledWith(false);
    });

    it("does not call onChange when clicking the already selected option", () => {
      const onChange = vi.fn();

      render(
        <Switch
          checked
          onChange={onChange}
          variant="squared"
          trueLabel="Yes"
          falseLabel="No"
        />,
      );

      fireEvent.click(screen.getByRole("radio", { name: "Yes" }));
      expect(onChange).not.toHaveBeenCalled();
    });

    it("applies custom height and full width by default", () => {
      const { container } = render(
        <Switch
          checked={false}
          onChange={vi.fn()}
          variant="squared"
          height={48}
        />,
      );

      const group = container.querySelector('[role="radiogroup"]');
      expect(group).toHaveClass("w-full");
      expect(group).toHaveStyle({ height: "48px" });
    });
  });
});
