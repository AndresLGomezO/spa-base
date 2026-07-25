import { describe, expect, it } from "vitest";

import type { AiJobStepTraceEntry } from "../../../schemas/ai-job.schema.js";
import { runFormsRenderOrchestrator } from "./run-forms-render-orchestrator.js";

const mockVertexConfig = {
  mockEnabled: true as const,
  projectId: "demo",
  region: "us-central1",
  modelId: "gemini-3.6-flash",
};

const entityCurrentFragment = `# Entity contract
Fields:
- name (\`name\`)
- type (\`type\`)
- provider (\`provider\`)
- amount (\`amount\`)
- startDate (\`startDate\`)
- endDate (\`endDate\`)
`;

describe("runFormsRenderOrchestrator trace", () => {
  it("records step trace with context blocks and output instruction", async () => {
    const trace: AiJobStepTraceEntry[] = [];

    const result = await runFormsRenderOrchestrator({
      vertexConfig: mockVertexConfig,
      entityName: "contract",
      userPrompt: "Premium contract wizard with review step",
      presentationHint: "wizard",
      entityCurrentFragment,
      formFieldPaths: [
        "name",
        "type",
        "provider",
        "amount",
        "startDate",
        "endDate",
      ],
      callbacks: {
        onProgress: async () => {},
        onDraftUpdate: async () => {},
        onStepTrace: async (entry) => {
          trace.push(entry);
        },
        onStepMerged: async () => {},
      },
    });

    expect(result.renderHtml).toContain("<!DOCTYPE html>");
    expect(trace).toHaveLength(1);
    expect(trace[0]?.stepId).toBe("formsRender.composeHtml");
    expect(trace[0]?.validationOk).toBe(true);
    expect(trace[0]?.outputInstruction).toContain("valid JSON");
    expect(trace[0]?.userText).toContain("form render preview");
    expect(
      trace[0]?.contextBlocks.some((block) => block.id === "entity.current"),
    ).toBe(true);
    expect(
      trace[0]?.contextBlocks.some((block) => block.id === "step.wizardPlan"),
    ).toBe(true);
    expect(trace[0]?.parsedJson).toBeDefined();
  });

  it("records refinement trace with summarized previous HTML block", async () => {
    const trace: AiJobStepTraceEntry[] = [];
    const previousHtml = `<!DOCTYPE html><html><body>${"x".repeat(5000)}</body></html>`;

    await runFormsRenderOrchestrator({
      vertexConfig: mockVertexConfig,
      entityName: "contract",
      userPrompt: "Premium contract wizard",
      presentationHint: "wizard",
      modificationRequest: "Use a darker sidebar",
      previousHtmlDocument: previousHtml,
      iterationNumber: 1,
      entityCurrentFragment,
      formFieldPaths: [
        "name",
        "type",
        "provider",
        "amount",
        "startDate",
        "endDate",
      ],
      callbacks: {
        onProgress: async () => {},
        onDraftUpdate: async () => {},
        onStepTrace: async (entry) => {
          trace.push(entry);
        },
      },
    });

    expect(trace[0]?.stepId).toBe("formsRender.refineHtml");
    const previousBlock = trace[0]?.contextBlocks.find(
      (block) => block.id === "step.previousHtmlDocument",
    );
    expect(previousBlock?.content).toContain("omitted from trace");
    expect(previousBlock?.content).not.toContain("xxxxx");
    expect(
      trace[0]?.contextBlocks.some(
        (block) => block.id === "step.renderIteration",
      ),
    ).toBe(true);
    expect(
      trace[0]?.contextBlocks.some(
        (block) => block.id === "user.modificationRequest",
      ),
    ).toBe(true);
  });
});
