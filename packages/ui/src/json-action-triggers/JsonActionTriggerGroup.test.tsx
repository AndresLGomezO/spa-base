import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JsonActionTriggerGroup } from "./JsonActionTriggerGroup";
import { JsonImportTriggerButton } from "./JsonImportTriggerButton";
import { JsonViewTriggerButton } from "./JsonViewTriggerButton";

describe("JsonActionTriggerGroup", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders group label and compact trigger buttons", () => {
    render(
      <JsonActionTriggerGroup>
        <JsonViewTriggerButton onClick={vi.fn()} />
        <JsonImportTriggerButton onClick={vi.fn()} />
      </JsonActionTriggerGroup>,
    );

    expect(screen.getByText("JSON")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "View JSON" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Import JSON" }),
    ).toBeInTheDocument();
  });

  it("can hide the group label", () => {
    render(
      <JsonActionTriggerGroup showGroupLabel={false}>
        <JsonViewTriggerButton onClick={vi.fn()} />
      </JsonActionTriggerGroup>,
    );

    expect(screen.queryByText("JSON", { exact: true })).not.toBeInTheDocument();
  });
});
