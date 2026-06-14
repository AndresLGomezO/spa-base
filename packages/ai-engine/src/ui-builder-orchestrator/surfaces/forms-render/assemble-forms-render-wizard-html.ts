import type { FormsRenderWizardOutput } from "./forms-render-steps.js";
import { sanitizeFormsRenderHtml } from "./sanitize-forms-render-html.js";

const BASE_WIZARD_NAV_CSS = `
.step-panel { display: none; }
.step-panel:target { display: block; }
#main-panels:not(:has(.step-panel:target)) .step-panel:first-of-type { display: block; }
`;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function assembleFormsRenderWizardHtml(
  output: FormsRenderWizardOutput,
): string {
  const panels = output.steps
    .map(
      (step) =>
        `<section id="${escapeAttr(step.id)}" class="step-panel" aria-labelledby="title-${escapeAttr(step.id)}">${step.panelHtml}</section>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base target="_self">
<title>${escapeAttr(output.wizardTitle)}</title>
<style>
${BASE_WIZARD_NAV_CSS}
${output.sharedStyles}
</style>
</head>
<body>
<div class="wizard-shell">
<aside class="wizard-sidebar">${output.sidebarHtml}</aside>
<main class="wizard-main">
<div id="main-panels">${panels}</div>
</main>
</div>
</body>
</html>`;

  return sanitizeFormsRenderHtml(html);
}

export function validateWizardFieldCoverage(
  html: string,
  fieldPaths: readonly string[],
): string[] {
  const errors: string[] = [];
  for (const path of fieldPaths) {
    const regex = new RegExp(`name=["']${escapeRegex(path)}["']`, "g");
    const matches = html.match(regex);
    if (!matches || matches.length === 0) {
      errors.push(`Missing field: ${path}`);
    } else if (matches.length > 1) {
      errors.push(`Duplicate field: ${path}`);
    }
  }
  return errors;
}
