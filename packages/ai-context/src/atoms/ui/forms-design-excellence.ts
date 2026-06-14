export const FORMS_DESIGN_EXCELLENCE_FRAGMENT_ID = "ui.forms.design-excellence";

export const FORMS_DESIGN_EXCELLENCE_GUIDANCE = `# Form layout design excellence

Design forms that feel guided, polished, and scannable — not flat field dumps.

## Presentation
- Prefer **wizard** when the entity has **more than 6** direct form fields.
- Target **3 ± 1 fields per wizard step** (max 4). Add a **review-only final step**.
- Use **plain** only for short create/edit flows with few fields.

## Wizard shell
- Shell layout: **wizard-progress** + **wizard-step-host** + **wizard-actions**.
- Pick a progress variant that fits the flow:
  - **steps** — vertical step list with labels (good for sidebars / left-rail)
  - **bar** — linear progress bar (compact header, mobile-friendly)
  - **stepper** — numbered circles with connectors (bold multi-step flows)
- Use **conditionalStyles** for active/completed/pending on steps and stepper variants; use **barTrackColor** / **barFillColor** for bar variant.

## Step layouts
- Open each step with **form-section** title when it helps orientation.
- Use **text** with \`primary.type: "static"\` for short tips or callouts (theme colors, padding, borderRadius).
- Group related **form-field** rows; hide redundant labels on obvious fields.

## Styling
- Theme first: ThemeToken (\`primary\`, \`success\`, \`muted\`) and semantic CSS vars.
- Apply \`styles\` on sections, callouts, and wizard-progress states.
- Use \`label\` config on form-fields — concise, human-readable text.

## UX bar
- Mobile-first: primary fields visible at \`base\`; tuck secondary metadata when helpful.
- Clear primary → secondary reading order within each step.
- Aim for confident whitespace and purposeful structure — not a wall of identical inputs.
`;

export const FORMS_CONTRACT_WIZARD_EXCERPT_FRAGMENT_ID =
  "ui.forms.contract-wizard-excerpt";

export const FORMS_CONTRACT_WIZARD_EXCERPT = `# Contract wizard exemplar (trimmed)

Reference patterns for rich wizard forms — adapt to the current entity fields.

## Shell progress variants (pick one)

**Step list (\`steps\`)** — vertical labeled steps:
\`\`\`json
{ "kind": "wizard-progress", "variant": "steps", "stepLabel": { "show": true, "position": "right", "bold": true } }
\`\`\`

**Progress bar (\`bar\`)**:
\`\`\`json
{ "kind": "wizard-progress", "variant": "bar", "barTrackColor": "muted", "barFillColor": "primary" }
\`\`\`

**Numbered stepper (\`stepper\`)**:
\`\`\`json
{
  "kind": "wizard-progress",
  "variant": "stepper",
  "stepLabel": { "show": true, "position": "bottom", "bold": true },
  "conditionalStyles": [
    { "matchValue": "active", "background": "primary", "textColor": "white" },
    { "matchValue": "completed", "background": "success", "textColor": "white" }
  ]
}
\`\`\`

## Step intro + fields
- Lead with \`form-section\` title matching the step label.
- Optional static \`text\` callout with muted styling for tips.
- 3–4 \`form-field\` rows per step.

## Footer
- \`wizard-actions\` in shell; optional \`form-actions\` in modal footer for secondary actions.
`;
