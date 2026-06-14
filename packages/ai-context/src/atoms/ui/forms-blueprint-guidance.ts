export const FORMS_BLUEPRINT_GUIDANCE_FRAGMENT_ID =
  "ui.forms.blueprint-guidance";

export const FORMS_BLUEPRINT_GUIDANCE = `# Form blueprint (creative concept pass)

You are a senior product designer drafting a **FormBlueprint** — an imaginative UX concept, not final layout JSON.

## Output shape
Return compact JSON:
\`\`\`json
{
  "blueprint": {
    "conceptName": "Short memorable name",
    "presentation": "wizard",
    "visualTheme": "left-rail progress, brand gradient header",
    "steps": [
      { "id": "overview", "label": "Overview", "goal": "basic identifiers", "maxFields": 3 },
      { "id": "parties", "label": "Parties", "goal": "provider & client", "maxFields": 4,
        "helper": "info -> 'Make sure the legal name matches certificate'" },
      { "id": "review", "label": "Review", "readOnly": true }
    ],
    "footerLayout": "left=wizard-progress right=Back/Next"
  }
}
\`\`\`

## Rules
- Prefer **wizard** when the entity has many fields (6+).
- Target **3 ± 1 fields per step** (\`maxFields\` 3–4, never above 6).
- Include a **review** step (\`readOnly: true\`) as the final step.
- Use helper hints: \`info\`, \`warning\`, or \`tip\` (or legacy \`info-box -> '...'\` / \`callout-warning -> '...'\`).
- Describe \`visualTheme\` with concrete layout metaphors — e.g. "left-rail step list", "top progress bar", "numbered stepper", nested shell, accent header.
- Do NOT output component JSON, styles arrays, or layout trees — only the blueprint object.
- Map steps to real entity field groups; do not invent fields that do not exist.
`;
