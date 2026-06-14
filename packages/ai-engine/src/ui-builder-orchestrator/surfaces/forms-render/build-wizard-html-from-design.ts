import type {
  RenderWizardPlan,
  RenderWizardPlanStep,
} from "./build-render-wizard-plan.js";
import type { FormsRenderWizardDesignOutput } from "./forms-render-steps.js";
import {
  assembleFormsRenderWizardHtml,
  validateWizardFieldCoverage,
} from "./assemble-forms-render-wizard-html.js";

const DEFAULT_WIZARD_STYLES = `
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f8fafc;color:#0f172a}
.wizard-shell{display:flex;min-height:100vh}
.wizard-sidebar{width:17rem;flex-shrink:0;background:#0f172a;color:#fff;padding:1.75rem 1.5rem}
.wizard-sidebar h1{margin:0 0 .5rem;font-size:1.25rem;font-weight:700}
.wizard-sidebar p{margin:0 0 1.5rem;color:#94a3b8;font-size:.875rem;line-height:1.4}
.wizard-nav{display:flex;flex-direction:column;gap:.25rem}
.wizard-nav a{display:flex;align-items:center;gap:.5rem;padding:.625rem .75rem;border-radius:8px;color:#cbd5e1;text-decoration:none;font-size:.875rem;font-weight:500}
.wizard-nav a:hover{background:rgba(255,255,255,.06);color:#fff}
.wizard-main{flex:1;padding:2rem}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1.75rem;box-shadow:0 1px 3px rgba(15,23,42,.08);max-width:42rem}
.card h2{margin:0 0 .375rem;font-size:1.375rem;font-weight:700}
.card .subtitle{margin:0 0 1.5rem;color:#64748b;font-size:.9375rem}
.field{margin-bottom:1.125rem;display:flex;flex-direction:column;gap:.375rem}
.field label{font-size:.875rem;font-weight:600;color:#0f172a}
.field input,.field select,.field textarea{padding:.625rem .75rem;border:1px solid #e2e8f0;border-radius:8px;font-size:.9375rem;background:#fff}
.field input:focus,.field select:focus,.field textarea:focus{outline:2px solid rgba(37,99,235,.25);border-color:#2563eb}
.field small{color:#64748b;font-size:.8125rem}
.info-box{margin:1rem 0;padding:.875rem 1rem;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;color:#1e40af;font-size:.875rem}
.actions{display:flex;justify-content:space-between;align-items:center;margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e2e8f0}
.btn{display:inline-flex;align-items:center;padding:.625rem 1rem;border-radius:8px;font-size:.875rem;font-weight:600;text-decoration:none}
.btn-primary{background:#2563eb;color:#fff;border:0}
.btn-secondary{background:#fff;color:#0f172a;border:1px solid #e2e8f0}
.review-list{margin:0;padding:0;list-style:none}
.review-list li{display:flex;justify-content:space-between;padding:.75rem 0;border-bottom:1px solid #f1f5f9;font-size:.875rem}
.review-list li span:first-child{color:#64748b}
@media(max-width:768px){.wizard-shell{flex-direction:column}.wizard-sidebar{width:100%}.wizard-main{padding:1rem}}
`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function humanizeFieldLabel(fieldPath: string): string {
  const leaf = fieldPath.includes(".")
    ? fieldPath.split(".").pop()!
    : fieldPath;
  return leaf
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferInputType(fieldPath: string): string {
  const lower = fieldPath.toLowerCase();
  if (lower.includes("email")) return "email";
  if (lower.includes("date")) return "date";
  if (
    lower.includes("amount") ||
    lower.includes("balance") ||
    lower.includes("price") ||
    lower.includes("quantity")
  ) {
    return "number";
  }
  if (lower.includes("description") || lower.includes("notes")) {
    return "textarea";
  }
  if (lower.startsWith("is") || lower.includes("recurring")) {
    return "checkbox";
  }
  return "text";
}

function buildFieldInputHtml(fieldPath: string): string {
  const label = humanizeFieldLabel(fieldPath);
  const inputType = inferInputType(fieldPath);
  const id = escapeHtml(fieldPath);

  if (inputType === "textarea") {
    return `<div class="field"><label for="${id}">${escapeHtml(label)}</label><textarea id="${id}" name="${id}" rows="4"></textarea></div>`;
  }
  if (inputType === "checkbox") {
    return `<div class="field"><label><input type="checkbox" id="${id}" name="${id}"> ${escapeHtml(label)}</label></div>`;
  }
  return `<div class="field"><label for="${id}">${escapeHtml(label)}</label><input id="${id}" name="${id}" type="${inputType}"></div>`;
}

function buildSidebarHtml(
  design: FormsRenderWizardDesignOutput,
  plan: RenderWizardPlan,
): string {
  const metaById = new Map(design.steps.map((step) => [step.id, step]));
  const links = plan.steps
    .map((step) => {
      const meta = metaById.get(step.id);
      const label = meta?.title ?? step.label;
      return `<a href="#${escapeHtml(step.id)}">${escapeHtml(label)}</a>`;
    })
    .join("");

  return `<header><h1>${escapeHtml(design.wizardTitle)}</h1><p>${escapeHtml(design.wizardSubtitle)}</p></header><nav class="wizard-nav">${links}</nav>`;
}

function buildReviewPanelHtml(
  step: RenderWizardPlanStep,
  title: string,
  subtitle: string | undefined,
  allEditableSteps: readonly RenderWizardPlanStep[],
): string {
  const items = allEditableSteps
    .flatMap((editableStep) => editableStep.fieldPaths)
    .map(
      (fieldPath) =>
        `<li><span>${escapeHtml(humanizeFieldLabel(fieldPath))}</span><span>—</span></li>`,
    )
    .join("");

  return `<article class="card"><h2 id="title-${escapeHtml(step.id)}">${escapeHtml(title)}</h2>${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}<ul class="review-list">${items}</ul><div class="actions"><span></span><button type="button" class="btn btn-primary">Create</button></div></article>`;
}

function buildEditablePanelHtml(
  step: RenderWizardPlanStep,
  plan: RenderWizardPlan,
  title: string,
  subtitle: string | undefined,
  helperText: string | undefined,
  stepIndex: number,
): string {
  const fieldsHtml = step.fieldPaths.map(buildFieldInputHtml).join("");
  const helperBlock = helperText
    ? `<div class="info-box">${escapeHtml(helperText)}</div>`
    : "";

  const prevStep = plan.steps[stepIndex - 1];
  const nextStep = plan.steps[stepIndex + 1];
  const backLink = prevStep
    ? `<a class="btn btn-secondary" href="#${escapeHtml(prevStep.id)}">Back</a>`
    : "<span></span>";
  const nextLink = nextStep
    ? `<a class="btn btn-primary" href="#${escapeHtml(nextStep.id)}">Next</a>`
    : "<span></span>";

  return `<article class="card"><h2 id="title-${escapeHtml(step.id)}">${escapeHtml(title)}</h2>${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}${helperBlock}${fieldsHtml}<div class="actions">${backLink}${nextLink}</div></article>`;
}

export function buildWizardHtmlFromDesign(
  plan: RenderWizardPlan,
  design: FormsRenderWizardDesignOutput,
): string {
  const metaById = new Map(design.steps.map((step) => [step.id, step]));
  const editableSteps = plan.steps.filter((step) => !step.readOnly);

  const assembledSteps = plan.steps.map((step, index) => {
    const meta = metaById.get(step.id);
    const title = meta?.title ?? step.label;
    const subtitle = meta?.subtitle;
    const panelHtml = step.readOnly
      ? buildReviewPanelHtml(step, title, subtitle, editableSteps)
      : buildEditablePanelHtml(
          step,
          plan,
          title,
          subtitle,
          meta?.helperText,
          index,
        );

    return {
      id: step.id,
      title,
      ...(subtitle ? { subtitle } : {}),
      panelHtml,
    };
  });

  const html = assembleFormsRenderWizardHtml({
    wizardTitle: design.wizardTitle,
    wizardSubtitle: design.wizardSubtitle,
    sharedStyles:
      `${DEFAULT_WIZARD_STYLES}\n${design.sharedStyles ?? ""}`.trim(),
    sidebarHtml: buildSidebarHtml(design, plan),
    steps: assembledSteps,
    layoutSummary: design.layoutSummary,
  });

  const fieldPaths = editableSteps.flatMap((step) => step.fieldPaths);
  const coverageErrors = validateWizardFieldCoverage(html, fieldPaths);
  if (coverageErrors.length > 0) {
    throw new Error(
      `Wizard HTML assembly missing fields: ${coverageErrors.join(", ")}`,
    );
  }

  return html;
}

export function normalizeWizardDesignSteps(
  plan: RenderWizardPlan,
  design: FormsRenderWizardDesignOutput,
): FormsRenderWizardDesignOutput {
  const metaById = new Map(design.steps.map((step) => [step.id, step]));
  return {
    ...design,
    steps: plan.steps.map((step) => {
      const meta = metaById.get(step.id);
      return {
        id: step.id,
        ...(meta?.title ? { title: meta.title } : { title: step.label }),
        ...(meta?.subtitle ? { subtitle: meta.subtitle } : {}),
        ...(meta?.helperText ? { helperText: meta.helperText } : {}),
      };
    }),
  };
}
