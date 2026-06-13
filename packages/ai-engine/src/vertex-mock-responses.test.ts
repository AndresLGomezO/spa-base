import { describe, expect, it } from "vitest";

import {
  buildMockChatAnswer,
  buildMockUiBuilderListAnswer,
  buildMockUiBuilderStepAnswer,
} from "./vertex-mock-responses.js";
import { LIST_STEP_TYPES } from "./ui-builder-orchestrator/surfaces/list/list-steps.js";

describe("buildMockChatAnswer", () => {
  it("returns a non-empty mock reply", () => {
    const answer = buildMockChatAnswer("How do I configure list views?");
    expect(answer.length).toBeGreaterThan(0);
    expect(answer).toContain("[mock]");
  });
});

describe("buildMockUiBuilderStepAnswer", () => {
  it("returns listViewType for selection step", () => {
    const rawAnswer = buildMockUiBuilderStepAnswer(
      LIST_STEP_TYPES.SELECT_VIEW_TYPE,
      [{ id: "entity.current", content: "- **Name** (`name`)" }],
    );
    expect(JSON.parse(rawAnswer)).toEqual({ listViewType: "table" });
  });

  it("returns table fields for table step", () => {
    const rawAnswer = buildMockUiBuilderStepAnswer(
      LIST_STEP_TYPES.TABLE_SELECT_FIELDS,
      [
        {
          id: "entity.current",
          content: "- **Name** (`name`)\n- **Email** (`email`)",
        },
      ],
    );
    const parsed = JSON.parse(rawAnswer) as { fields: string[] };
    expect(parsed.fields).toEqual(["name", "email"]);
  });
});

describe("buildMockUiBuilderListAnswer", () => {
  it("delegates to select view type step mock", () => {
    const rawAnswer = buildMockUiBuilderListAnswer([
      {
        id: "entity.current",
        content: "- **Name** (`name`)\n- **Email** (`email`)",
      },
    ]);

    expect(JSON.parse(rawAnswer)).toEqual({ listViewType: "table" });
  });
});
