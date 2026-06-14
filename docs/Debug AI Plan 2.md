────────────────────────────────────────────────────────────
AI-Generated UI - Debug & Hardening Playbook  (continued)
Focus: style attributes, units, miscellaneous “extra” props
────────────────────────────────────────────────────────────
Context  
• Many model outputs now pass structural validation but still break downstream because they contain CSS-like strings (`"24px 0"`, `"8rem"`, `"auto"`) where our canonical schema accepts only **numbers in pixels** or **enumerated keywords**.  
• Other times the model invents props that are simply not part of the component schema (`"textAlign": "justify"`, `"gap": 6`).  
Goal  
1. Detect these issues as early as possible (step validation).  
2. Auto-repair when safe.  
3. Fail fast with an actionable error when auto-repair cannot decide.  

Below is a step-by-step recipe you can drop into your repo.

────────────────────────────────────────
7. Harden style validation & coercion
────────────────────────────────────────
7-A  Add a “style sanitiser” layer shared by all surfaces  
Create `packages/ai-engine/src/sanitizers/sanitize-style-props.ts`.

```ts
import { z } from 'zod';

const pxNumber = z
  .string()
  .regex(/^([0-9]+)px$/)
  .transform((s) => parseInt(s, 10));

/** Converts  "24px" | 24 | "0"  → 24 (number)  */
export function toPxNumber(input: unknown): number | undefined {
  if (typeof input === 'number') return input;
  if (typeof input === 'string' && input.trim() !== '') {
    // "24px"   "24"   "24.0"
    const m = input.match(/^([0-9]+(?:\.[0-9]+)?)px?$/);
    if (m) return Number(m[1]);
  }
  return undefined;
}

const allowedSpacingKeys = new Set([
  'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
  'margin',  'marginTop',  'marginBottom', 'marginLeft',  'marginRight',
  'rowGap', 'columnGap', 'gap'
]);

export function sanitizeStyleProps(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    // 1) Strip unknown props early
    if (!allowedSpacingKeys.has(k) &&
        !['backgroundColor', 'color', 'fontWeight', 'fontSize'].includes(k)) continue;

    // 2) Coerce spacing values
    if (allowedSpacingKeys.has(k)) {
      const n = toPxNumber(v);
      if (n !== undefined) { out[k] = n; }
      continue;
    }

    // 3) Leave safe props intact; drop the rest
    out[k] = v;
  }
  return out;
}
```

7-B  Integrate into every component-sanitiser  
Example `sanitize-list-component-config.ts`:

```ts
import { sanitizeStyleProps } from '../sanitizers/sanitize-style-props.ts';

export function sanitizeListComponentConfig(cfg: UiComponentConfig): UiComponentConfig {
  const cloned = structuredClone(cfg);

  // …existing fieldPath / badgeVariant repairs

  if (cloned.styles) cloned.styles = sanitizeStyleProps(cloned.styles);
  if (cloned.conditionalStyles) {
    cloned.conditionalStyles = cloned.conditionalStyles.map((rule) => ({
      ...rule,
      styles: sanitizeStyleProps(rule.styles),
    }));
  }
  return cloned;
}
```

7-C  Fallback default for unresolved spacing  
If after coercion a spacing prop is still `undefined`, drop it and rely on theme default paddings to avoid rendering  `NaNpx`.

────────────────────────────────────────
8. Improve schema feedback – fail fast *with context*
────────────────────────────────────────
8-A  Extend Zod error aggregation  
Inside `step-runner.ts` wrap the Zod parse to append **sanitised JSON** when parsing fails.  
```ts
try {
  parsed = step.outputSchema.parse(normalized);
} catch (err) {
  throw new StepValidationError(
     'Parsing failed after sanitise',
     { rawModelAnswer, normalizedJson: normalized, zodErrors: err.errors });
}
```
This allows you to see exactly which field or unit triggered the rejection.

8-B  Add unit tests with malicious style units  
`sanitize-style-props.test.ts`:
```ts
it('strips rem units and converts px to number', () => {
  const out = sanitizeStyleProps({ padding: '24px', marginLeft: '1.5rem', gap: '8' });
  expect(out).toEqual({ padding: 24, gap: 8 });
});
```

────────────────────────────────────────
9. Prompt-side guardrails (cheap insurance)
────────────────────────────────────────
9-A  Expand the System Instruction snippet you already send:

Add after the responsive rule:

```
- For spacing (padding, margin, gap) output ONLY integer pixel numbers (e.g. 16, 24).  Do NOT include "px", "rem", percentages, or shorthand strings.
```

9-B  In the Output Instruction for `layoutSkeleton` / `configureComponent` add:

```
Spacing properties must be numbers (no units). Unknown style keys will be ignored.
```

This reduces—but does not eliminate—unit errors.

────────────────────────────────────────
10. “Red-flag detector” CI check
────────────────────────────────────────
(optional but helpful on large teams)

10-A  CLI script `pnpm ai:scan` that walks all JSON fixtures / suggestions and logs:

• any string containing `px`, `rem`, `%` attached to a spacing key  
• any object key not in the canonical `ALLOWED_STYLE_KEYS` set

10-B  Wire into the monorepo test script so that PRs introducing new fixtures can’t merge
with non-sanitised styles.

────────────────────────────────────────
11. Common “extras” worth fixing or rejecting outright
────────────────────────────────────────
Case | How to handle
--- | ---
`"textAlign": "justify"` on `text` component | Drop (presentational)
`"gap"` on non-layout components | Drop (harmless)
`"position": "absolute"` | Hard-fail (breaks responsive grid)
`"borderRadius": 8` on `image` | Keep (safe & supported)
`"style": "color:red"` | Drop (legacy HTML attr)
Longhand `"padding": "16px 0"` | Cannot coerce → split or drop; prefer fail with message so that we extend sanitiser when needed.

Put these rules in `sanitizeStyleProps()` and cover them by tests.

────────────────────────────────────────
12. Putting it all together – review checklist
────────────────────────────────────────
Run this order whenever a designer complains “the AI layout looks broken”.

1. In Firestore copy the failing step’s `rawModelAnswer` into `/tmp/fail.json`.  
2. Execute `pnpm tsx scripts/validate-step.ts /tmp/fail.json forms.layoutSkeleton`.  
   – check if the failure is unit, unknown property, or structural.  
3. If **unit error**, update `sanitize-style-props.ts`; re-run `pnpm test`.  
4. If **unknown property**, add to whitelist or drop.  
5. If **structural**, update step prompt / coercer.  
6. Re-run the job from the previous good step (`onDraftUpdate` still has a checkpoint).  
7. Once green, save failing JSON under `surfaces/forms/fixtures/` with a `should-pass` suffix.  
8. Commit sanitiser + fixture + test in one PR.

────────────────────────────────────────
13. Time estimates
────────────────────────────────────────
Task | Owner | Effort
---- | ----- | ------
Create shared sanitiser & integrate | FE infra dev | 1.0 d
Add prompt guardrails | AI prompt owner | 0.25 d
Extend Zod error context | AI/BE dev | 0.25 d
Add CI red-flag script | DevOps | 0.5 d
Fixture + tests (initial) | QA | 0.5 d

────────────────────────────────────────
14. Next debug focus candidates
────────────────────────────────────────
• Conditional style `badgeVariant` drift (already fixed for lists; port to forms).  
• Invented *enum* values for select components.  
• Wizard step label localisation.

Keep looping through “collect fixture ➜ write coercer or sanitiser ➜ write test ➜ guardrail in prompt” until failures trend toward *zero unsanitised suggestions per sprint*.

────────────────────────────────────────
End of continued AI Debug Plan
────────────────────────────────────────