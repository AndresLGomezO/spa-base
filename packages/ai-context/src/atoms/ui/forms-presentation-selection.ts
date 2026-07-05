export const FORMS_PRESENTATION_SELECTION_FRAGMENT_ID =
  "ui.forms.presentation-selection";

export const FORMS_PRESENTATION_SELECTION_GUIDANCE = `# Form presentation selection

Choose exactly ONE presentation before designing layout JSON. In the designer, presentation is selected via **layout preset** (platform built-in or tenant preset) — not a separate wizard/plain switch.

## plain
Default preset: \`plain-form\`.
Best when:
- Simple create/edit forms with a moderate number of fields
- All fields visible on one screen
- Standard modal or page forms without step navigation

## wizard
Default preset: \`wizard-form\`.
Best when:
- Many fields that benefit from logical grouping (**more than 6 direct form fields** → prefer wizard automatically)
- Multi-step onboarding or complex data entry flows
- The user explicitly asks for steps, wizard, or progressive disclosure

If the user prefers a type, honor that preference as a **hint** unless entity fields clearly fit another type better.
When the user asks for a guided or step-by-step experience, choose **wizard**.
`;
