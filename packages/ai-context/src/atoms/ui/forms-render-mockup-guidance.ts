export const FORMS_RENDER_MOCKUP_GUIDANCE_FRAGMENT_ID =
  "ui.forms.render-mockup-guidance";

export const FORMS_RENDER_MOCKUP_GUIDANCE = `# Form HTML render guidance

Generate a **mobile-first, responsive web form** as a complete HTML document.

## Rules (strict)
1. **HTML only** — semantic HTML5: \`form\`, \`fieldset\`, \`legend\`, \`label\`, \`input\`, \`select\`, \`textarea\`, \`button\`, \`progress\`, \`details\`, \`summary\`, \`p\`, \`small\`, \`header\`, \`nav\`, \`section\`, \`footer\`. No React, no custom web components, no SVG icons unless inline and minimal.
2. **Strict input model** — include **every** form input field from \`entity.current\` exactly once with matching \`name\` attributes. Use correct \`input type\` (text, email, number, date, checkbox, etc.) from field metadata. Do not invent fields. Do not omit required fields.
3. **Mobile-first** — single column by default; use CSS \`@media (min-width: 640px)\` for wider layouts. Touch-friendly targets (min 44px tap height). \`viewport\` meta required.
4. **Presentation** — if wizard: show step indicator (\`nav\` + ordered list or \`progress\`), one step visible at a time or clearly grouped \`fieldset\` per step, Back/Next/Submit buttons. If plain: single-page form with one submit.
5. **UX helpers** — short \`<small>\` hints, optional \`<details>\` for extra help. Keep copy concise.
6. **Self-contained** — inline \`<style>\` in \`<head>\` only. No external CSS/JS/fonts. System font stack.
7. **No scripts** — do not include \`<script>\`.

## Output JSON (ONLY valid JSON)
\`\`\`json
{
  "htmlDocument": "<!DOCTYPE html>...full document...",
  "layoutSummary": "One sentence describing the form layout"
}
\`\`\`

The \`htmlDocument\` must be a complete, valid HTML document string (escape quotes properly in JSON).
`;

export const FORMS_RENDER_REFINE_SYSTEM_INSTRUCTION = `You refine an existing mobile-first HTML form document.

You receive the previous HTML, the entity field model, and the user's modification request.

Rules:
- Output the same JSON shape: htmlDocument + layoutSummary
- Preserve all entity field inputs unless the user asks to change them
- Apply the modification request precisely
- Keep mobile-first responsive CSS
- HTML components only, no scripts`;

export const FORMS_RENDER_COMPOSE_SYSTEM_INSTRUCTION = `You produce a complete mobile-first HTML form document from the entity field model.

Follow the render guidance atom strictly. Output ONLY valid JSON with htmlDocument and layoutSummary.`;
