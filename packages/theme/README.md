# @repo/theme

Design tokens, semantic color system, tenant branding helpers, and light/dark color scheme for the platform.

**Full guide:** [docs/theme-and-tenant-branding-guide.md](../../docs/theme-and-tenant-branding-guide.md)

---

## Token model (three layers)

```
Palette scales          Semantic tokens              Components
--color-primary-600  →  --color-primary           →  bg-primary
--color-neutral-100  →  --color-muted             →  bg-muted
--color-neutral-200  →  --color-border            →  border-border
```

- **Scales** live in `src/tokens.css` (and tenant overrides on `:root`).
- **Semantics** map scales to meaning in `src/semantics.css`; `src/dark.css` remaps under `.dark`.
- **UI** should consume semantics via Tailwind utilities, not raw `primary-600` / `neutral-100` in shared components.

---

## Package exports

| Export               | Description                                                             |
| -------------------- | ----------------------------------------------------------------------- |
| `./index.css`        | Bundled fonts + tokens + semantics + dark + base                        |
| `./tokens.css`       | Color scales, sidebar, typography, radius                               |
| `./semantics.css`    | Semantic / surface / interactive tokens                                 |
| `./dark.css`         | Dark variant overrides                                                  |
| `./base.css`         | Body and form defaults                                                  |
| `./fonts.css`        | Inter font import                                                       |
| `./tenant-overrides` | `appearanceToCssVariables`, palette expansion, presets, override groups |
| `./palette`          | `generateColorScale`, `expandPaletteConfig`                             |
| `./react`            | `ThemeProvider`, `useColorScheme`, `useDarkMode`                        |
| `./utils`            | `cn()` (clsx + tailwind-merge)                                          |

---

## App setup

```css
/* apps/web/app/app.css */
@import "@repo/theme/fonts.css";
@import "tailwindcss";
@import "@repo/theme/tokens.css";
@import "@repo/theme/semantics.css";
@import "@repo/theme/dark.css";
@import "@repo/theme/base.css";
```

Wrap the app with `ThemeProvider` from `@repo/theme/react` (see [apps/web/app/root.tsx](../../apps/web/app/root.tsx)).

Apply tenant branding with `appearanceToCssVariables()` on `document.documentElement` ([TenantBrandingProvider](../../apps/web/app/theme/TenantBrandingProvider.tsx)).

---

## Tenant appearance

Type: `TenantAppearance` from `@repo/shared-types`.

```ts
import { appearanceToCssVariables } from "@repo/theme/tenant-overrides";

appearanceToCssVariables({
  preset: "soft", // optional: "soft" | "bold"
  palettes: {
    primary: { anchorStep: "500", anchorColor: "#0095f6" },
    neutral: { anchorStep: "50", anchorColor: "#fafafa" },
  },
  semantics: {
    "--color-card": "#ffffff",
  },
  fontFamily: "Inter, sans-serif",
});
```

### Presets

- `default` — no merge
- `soft`, `bold`, `elegant`, `sophisticated`, `professional`, `business`, `frutigerAero` — see [`src/presets/catalog.ts`](src/presets/catalog.ts)

Legacy saved `preset: "instagram"` is normalized to `soft` at runtime.

### Override groups

`TENANT_OVERRIDE_GROUPS`: `primary`, `neutral`, `semantics`, `sidebar`, `typography`, `layout`.

---

## Source layout

```
src/
  tokens.css              # Scales + sidebar + layout tokens
  semantics.css           # Semantic layer (@theme)
  dark.css                # .dark remaps
  base.css
  fonts.css
  index.css               # Aggregates imports
  tenant-overrides.ts     # appearanceToCssVariables + exports
  palette/                # OKLCH scale generation
  semantics/              # Semantic var list + expansion
  presets/catalog.ts        # All named preset definitions
  presets/index.ts          # applyAppearancePreset, normalizeAppearancePreset
  react/                  # ThemeProvider, color scheme
```

---

## Commands

```bash
pnpm --filter @repo/theme test
pnpm --filter @repo/theme typecheck
pnpm --filter @repo/theme validate
```

---

## Adding a new semantic token

1. Add `--color-*` in `semantics.css` (reference scales with `var()`).
2. If dark mode differs, add override in `dark.css` under `@variant dark`.
3. If tenants may override it, add to `SEMANTIC_OVERRIDABLE_CSS_VARS` in `semantics/semantic-vars.ts` and document in the branding guide.
4. Use the matching Tailwind utility in `@repo/ui` (e.g. `bg-new-token` for `--color-new-token`).
5. Extend tests in `semantics/resolve-semantics.test.ts` if behavior is non-trivial.
