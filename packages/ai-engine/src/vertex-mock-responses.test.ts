import { describe, expect, it } from "vitest";

import {
  buildMockChatAnswer,
  buildMockRecordNarrativeAnswer,
  buildMockUiBuilderListAnswer,
  buildMockUiBuilderStepAnswer,
  looksLikeRecordNarrativePrompt,
} from "./vertex-mock-responses.js";
import { LIST_STEP_TYPES } from "./ui-builder-orchestrator/surfaces/list/list-steps.js";

describe("buildMockChatAnswer", () => {
  it("returns a non-empty mock reply", () => {
    const answer = buildMockChatAnswer("How do I configure list views?");
    expect(answer.length).toBeGreaterThan(0);
    expect(answer).toContain("[mock]");
  });
});

describe("buildMockRecordNarrativeAnswer", () => {
  it("returns JSON with chart placeholders from Data snapshot", () => {
    const userText = `Role text\n\n**Data:**\n${JSON.stringify({
      terms: { termMonths: 180, remainingTermMonths: 131 },
      payment: {
        lastInterestPayment: 100,
        lastPrincipalPayment: 50,
      },
    })}`;
    expect(looksLikeRecordNarrativePrompt(userText)).toBe(true);
    const parsed = JSON.parse(buildMockRecordNarrativeAnswer(userText)) as {
      text: string;
      charts: Array<{ kind: string; percent?: number }>;
    };
    expect(parsed.text).toContain("{{chart:0}}");
    expect(parsed.charts[0]?.kind).toBe("progress");
    expect(parsed.charts[0]?.percent).toBe(27);
    expect(parsed.charts[1]?.kind).toBe("bar");
  });
});

describe("buildMockUiBuilderStepAnswer", () => {
  it("returns listViewType for selection step", () => {
    const rawAnswer = buildMockUiBuilderStepAnswer(
      LIST_STEP_TYPES.SELECT_VIEW_TYPE,
      [{ id: "entity.current", content: "- **Name** (`name`)" }],
    );
    expect(JSON.parse(rawAnswer)).toEqual({ listViewType: "expandableTable" });
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

    expect(JSON.parse(rawAnswer)).toEqual({ listViewType: "expandableTable" });
  });
});
