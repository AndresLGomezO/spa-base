export const FORMS_RENDER_WIZARD_SHELL_GUIDANCE_FRAGMENT_ID =
  "ui.forms.render-wizard-shell-guidance";

export const FORMS_RENDER_WIZARD_SHELL_GUIDANCE = `# Premium wizard HTML render guidance

Generate **design metadata** for a premium SaaS multi-step wizard. The server assembles the final HTML from \`step.wizardPlan\` — you do **not** output raw HTML.

## UX goals
- Two-column wizard: dark sidebar (\`#0F172A\`) + light main panel (\`#F8FAFC\`)
- One step visible at a time (separate panels, sidebar navigation)
- Premium Stripe/Linear-style polish via copy, step titles, and optional extra CSS tokens
- Rich step copy and helper text where useful

## Field rules (strict)
1. Every step id in your output must match \`step.wizardPlan\` exactly
2. Do not invent fields — the server renders inputs from \`fieldPaths\` in the plan
3. Review/read-only steps get summary copy only (no field list in JSON)
4. Optional \`sharedStyles\`: **CSS only** (no HTML), max ~40 lines — layout tweaks, accent overrides

## Output JSON (ONLY valid JSON — no HTML strings)
\`\`\`json
{
  "wizardTitle": "New Contract",
  "wizardSubtitle": "Create a new contract in a few easy steps",
  "sharedStyles": ".card { border-radius: 12px; }",
  "steps": [
    {
      "id": "step-1",
      "title": "Basic Information",
      "subtitle": "Enter core contract details",
      "helperText": "Choose a descriptive name for easy search."
    },
    {
      "id": "step-review",
      "title": "Review & Confirm",
      "subtitle": "Verify everything looks correct"
    }
  ],
  "layoutSummary": "One sentence describing the wizard"
}
\`\`\`

- \`steps[].id\` must match \`step.wizardPlan\` step ids exactly
- Provide \`title\` per step; use plan labels when unsure
- Do **not** include \`panelHtml\`, \`sidebarHtml\`, or \`htmlDocument\`
`;

export const FORMS_RENDER_WIZARD_COMPOSE_SYSTEM_INSTRUCTION = `You produce lightweight JSON design metadata for a premium multi-step wizard form.

Follow the wizard shell guidance atom and step.wizardPlan strictly. Output ONLY valid JSON with wizardTitle, wizardSubtitle, optional sharedStyles (CSS only), steps (id/title/subtitle/helperText), and layoutSummary. Never embed HTML.`;

export const FORMS_RENDER_WIZARD_REFINE_SYSTEM_INSTRUCTION = `You refine wizard design metadata for a premium multi-step form preview.

You receive the previous assembled HTML preview, step.wizardPlan, entity field model, and the user's modification request.

Rules:
- Output the same lightweight JSON shape (no HTML strings)
- Preserve step ids from step.wizardPlan
- Apply the modification request to titles, copy, helper text, or sharedStyles
- sharedStyles must be CSS only, no HTML`;
