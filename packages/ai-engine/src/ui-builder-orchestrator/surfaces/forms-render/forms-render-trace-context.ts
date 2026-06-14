const PREVIOUS_HTML_TRACE_BLOCK_ID = "step.previousHtmlDocument";

export function summarizePreviousHtmlForTrace(html: string): string {
  const chars = html.length;
  const stepPanelCount = (html.match(/class="step-panel"/g) ?? []).length;
  const fieldCount = (html.match(/\sname=["']/g) ?? []).length;
  return `[Previous HTML document omitted from trace — ${chars} chars sent to model, ~${stepPanelCount} step panels, ~${fieldCount} named fields]`;
}

/** Trace-safe context blocks: full content except huge HTML payloads. */
export function sanitizeRenderTraceContextBlocks(
  blocks: readonly { readonly id: string; readonly content: string }[],
): Array<{ id: string; content: string }> {
  return blocks.map((block) => {
    if (block.id === PREVIOUS_HTML_TRACE_BLOCK_ID) {
      return {
        id: block.id,
        content: summarizePreviousHtmlForTrace(block.content),
      };
    }
    return { id: block.id, content: block.content };
  });
}
