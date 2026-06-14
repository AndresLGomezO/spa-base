import { describe, expect, it } from "vitest";

import type { AiJobStepTraceEntry } from "./schemas/ai-job.schema.js";
import {
  MAX_STEP_TRACE_BYTES,
  sanitizeStepTraceForPersistence,
  slimUiBuilderDraftForPersistence,
  stripCurrentLayoutJsonFromJobInput,
} from "./sanitize-ai-job-persistence.js";

function traceEntry(
  overrides: Partial<AiJobStepTraceEntry> = {},
): AiJobStepTraceEntry {
  return {
    stepId: "forms.layoutSkeleton:wizard.shell",
    attempt: 0,
    systemInstruction: "system",
    contextBlocks: [{ id: "entity.current", content: "fields" }],
    userText: "user",
    outputInstruction: "output",
    rawModelAnswer: "{}",
    validationOk: true,
    ...overrides,
  };
}

describe("sanitizeStepTraceForPersistence", () => {
  it("uses higher content limits for formsRender trace entries", () => {
    const large = "y".repeat(20_000);
    const [entry] = sanitizeStepTraceForPersistence([
      traceEntry({
        stepId: "formsRender.composeHtml",
        contextBlocks: [{ id: "entity.current", content: large }],
      }),
    ]);

    expect(entry?.contextBlocks[0]?.content.length).toBeGreaterThan(1_200);
    expect(entry?.contextBlocks[0]?.content.length).toBeLessThanOrEqual(20_000);
  });

  it("truncates oversized context block content", () => {
    const huge = "x".repeat(50_000);
    const [entry] = sanitizeStepTraceForPersistence([
      traceEntry({
        contextBlocks: [{ id: "step.task", content: huge }],
      }),
    ]);

    expect(entry?.contextBlocks[0]?.content.length).toBeLessThan(huge.length);
    expect(entry?.contextBlocks[0]?.content).toContain("truncated");
  });

  it("summarizes draft snapshots instead of storing full layout targets", () => {
    const [entry] = sanitizeStepTraceForPersistence([
      traceEntry({
        draftBeforeStep: {
          surface: "forms",
          presentation: "wizard",
          completedStepIds: ["a"],
          layoutTargets: {
            "wizard.shell": {
              skeleton: [{ kind: "wizard-progress" }],
              componentConfigs: { "root/0": { kind: "wizard-progress" } },
            },
          },
        },
      }),
    ]);

    const summary = entry?.draftBeforeStep as {
      layoutTargetKeys?: string[];
      layoutTargets?: unknown;
    };
    expect(summary.layoutTargetKeys).toEqual(["wizard.shell"]);
    expect(summary.layoutTargets).toBeUndefined();
  });

  it("stays under the trace byte budget for many entries", () => {
    const blockContent = "context ".repeat(500);
    const trace = Array.from({ length: 40 }, (_, index) =>
      traceEntry({
        stepId: `forms.configureComponent:step-${index}`,
        attempt: index % 3,
        contextBlocks: [
          { id: "ui.layout.base", content: blockContent },
          { id: "entity.current", content: blockContent },
        ],
        rawModelAnswer: JSON.stringify({ component: { kind: "text" } }),
        draftBeforeStep: {
          surface: "forms",
          layoutTargets: Object.fromEntries(
            Array.from({ length: 8 }, (_, keyIndex) => [
              `wizard.steps[${keyIndex}]`,
              {
                skeleton: [{ kind: "form-field", fieldPath: "name" }],
                componentConfigs: { "root/0": { kind: "form-field" } },
              },
            ]),
          ),
        },
      }),
    );

    const sanitized = sanitizeStepTraceForPersistence(trace);
    const bytes = new TextEncoder().encode(JSON.stringify(sanitized)).length;

    expect(bytes).toBeLessThanOrEqual(MAX_STEP_TRACE_BYTES);
    expect(sanitized.length).toBeGreaterThan(0);
  });
});

describe("slimUiBuilderDraftForPersistence", () => {
  it("drops component configs and currentLayoutJson from draft", () => {
    const slim = slimUiBuilderDraftForPersistence({
      surface: "forms",
      presentation: "wizard",
      currentLayoutJson: "{".repeat(100_000),
      layoutTargets: {
        "wizard.shell": {
          pathKey: "wizard.shell",
          label: "Shell",
          skeleton: [{ kind: "wizard-progress" }],
          componentConfigs: {
            "root/0": { kind: "wizard-progress", variant: "stepper" },
          },
        },
      },
    });

    expect(slim.currentLayoutJson).toBeUndefined();
    const shell = slim.layoutTargets as Record<
      string,
      { componentConfigs?: unknown; skeleton?: unknown[] }
    >;
    expect(shell["wizard.shell"]?.skeleton).toHaveLength(1);
    expect(shell["wizard.shell"]?.componentConfigs).toBeUndefined();
  });
});

describe("stripCurrentLayoutJsonFromJobInput", () => {
  it("removes currentLayoutJson from stored job input", () => {
    expect(
      stripCurrentLayoutJsonFromJobInput({
        question: "design",
        entityName: "contract",
        surface: "forms",
        currentLayoutJson: "{ huge }",
      }),
    ).toEqual({
      question: "design",
      entityName: "contract",
      surface: "forms",
    });
  });
});
