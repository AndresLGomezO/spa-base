# Theme and tenant branding

How colors, typography, and tenant-specific styling work in the monorepo: **palette scales → semantic tokens → UI components**.

**Package reference:** [packages/theme/README.md](../packages/theme/README.md)  
**Platform UI:** [admin-dashboard-guide.md](./admin-dashboard-guide.md) § Appearance  
**Logo storage:** [gcs-storage-guide.md](./gcs-storage-guide.md)

---

## Architecture

```mermaid
flowchart TB
  subgraph storage [Persistence]
    FS["Firestore tenants.appearance"]
  end
  subgraph theme_pkg ["@repo/theme"]
    PAL["Primary + neutral scales\n50–950"]
    SEM["semantics.css\n--color-primary, --color-card, …"]
    DARK["dark.css\n.dark remaps"]
    PRE["Presets soft / bold"]
    FN["appearanceToCssVariables()"]
  end
  subgraph web [apps/web]
    TBP["TenantBrandingProvider\ninline styles on :root"]
    ED["TenantAppearanceEditor"]
  end
  subgraph ui ["@repo/ui"]
    BTN["bg-primary hover:bg-primary-hover"]
  end
  FS --> FN
  ED --> FS
  PRE --> FN
  PAL --> SEM
  SEM --> DARK
  FN --> TBP
  TBP --> PAL
  TBP --> SEM
  SEM --> BTN
```

1. **Palette scales** (`--color-primary-500`, `--color-neutral-100`, …) — generated from an anchor color (OKLCH-based) or set per shade.
2. **Semantic tokens** (`--color-primary`, `--color-muted`, `--color-card`, …) — defined in CSS as `var(--color-*-step)` so changing a tenant palette updates buttons, surfaces, and hovers automatically.
3. **Components** — use Tailwind utilities tied to semantics (`bg-primary`, `text-muted-foreground`, `hover:bg-hover`), not raw scale steps like `bg-primary-600`.

Dark mode uses the existing **`.dark` class** on `<html>` (via `ThemeProvider` / `useColorScheme`). Semantic overrides in `dark.css` remap surfaces and hovers; tenant scale overrides on `:root` still flow through `var()` references.

---

## CSS files (import order)

Apps and Storybook should import theme CSS in this order:

```css
@import "@repo/theme/fonts.css";
@import "tailwindcss";
@import "@repo/theme/tokens.css";      /* scales, sidebar, typography, radius */
@import "@repo/theme/semantics.css";  /* palette → semantic mappings */
@import "@repo/theme/dark.css";       /* .dark semantic remaps */
@import "@repo/theme/base.css";       /* body, form defaults */
```

Example: [apps/web/app/app.css](../apps/web/app/app.css).

| File | Role |
|------|------|
| [tokens.css](../packages/theme/src/tokens.css) | Primary, neutral, success, danger, warning scales; sidebar; font/spacing/radius |
| [semantics.css](../packages/theme/src/semantics.css) | Semantic + surface + text hierarchy + interactive + component shortcut tokens |
| [dark.css](../packages/theme/src/dark.css) | Dark-mode semantic remaps |
| [base.css](../packages/theme/src/base.css) | Global element defaults |

---

## Tenant appearance model

Stored on the tenant document as `appearance` ([`TenantAppearance`](../packages/shared-types/src/tenant/tenant-appearance.ts)), validated by API with `tenantAppearanceSchema`.

| Field | Purpose |
|-------|---------|
| `logoUrl` | Public URL for sidebar logo (uploaded via admin API → GCS) |
| `preset` | `"default"` (omit) or a named preset — merges bundled palette/semantic defaults before user fields |
| `palettes.primary` | `{ anchorStep, anchorColor, shadeOverrides? }` — generates `--color-primary-*` |
| `palettes.neutral` | Same shape — generates `--color-neutral-*` |
| `semantics` | Map of CSS var → hex (or any CSS color), e.g. `"--color-card": "#ffffff"` |
| `colors` | Legacy/extra overrides; sidebar keys only in the editor; non-palette semantic keys also apply |
| `fontFamily`, `fontSizes`, `radius`, `spacing` | Typography and layout tokens |

### Presets

| Preset | Character |
|--------|-------------|
| `default` | Product default scales and semantics (no extra merge) |
| `soft` | Light surfaces, blue primary, subtle borders |
| `bold` | Strong violet primary, higher-contrast neutrals |
| `elegant` | Warm ivory neutrals, espresso accent |
| `sophisticated` | Cool slate surfaces, restrained teal primary |
| `professional` | Corporate blue, clean gray borders |
| `business` | Conservative navy, high-readability neutrals |
| `frutigerAero` | Glossy aqua primary, sky-tinted backgrounds |

Definitions live in [packages/theme/src/presets/catalog.ts](../packages/theme/src/presets/catalog.ts). Presets set **palettes only** (not light-only semantic hex) so [dark.css](../packages/theme/src/dark.css) can remap surfaces and text when the user toggles dark mode.

Saved `preset: "instagram"` (legacy) is normalized to `soft` when loaded.  
`appearanceToCssVariables(appearance, { colorScheme })` skips inline semantics that `dark.css` already remaps when `colorScheme` is `"dark"`.  
Merge logic: `applyAppearancePreset()` in [packages/theme/src/presets/index.ts](../packages/theme/src/presets/index.ts).

### Runtime application

[`TenantBrandingProvider`](../apps/web/app/theme/TenantBrandingProvider.tsx) reads `tenantAppearance` from auth context and calls:

```ts
appearanceToCssVariables(appearance)
```

That function (in [tenant-overrides.ts](../packages/theme/src/tenant-overrides.ts)):

1. Applies preset merge
2. Expands palettes to scale CSS variables
3. Merges `semantics` and semantic keys from `colors`
4. Applies typography/layout fields

Variables are set on `document.documentElement` and cleared on tenant change/unmount.

---

## Platform UI: Appearance editor

**Route:** `/settings/appearance` (superadmin, active tenant)  
**Component:** [TenantAppearanceEditor.tsx](../apps/web/app/components/platform/TenantAppearanceEditor.tsx)

| Section | What it does |
|---------|----------------|
| Logo | `PhotoUpload` → `POST /admin/tenants/:id/logo` |
| Theme preset | Dropdown: Default + seven named presets — fills palette + sample semantics |
| Primary / neutral palette | Anchor step + color; optional per-shade overrides; live scale preview |
| Semantic colors | Overrides for `TENANT_OVERRIDE_GROUPS.semantics` |
| Sidebar | Direct CSS vars for sidebar chrome |
| Typography / layout | `--font-sans`, text sizes, `--radius-md`, `--spacing` |
| Preview panel | Inline `style={previewVars}` so draft theme is visible before save |

Save sends `appearance` on `PATCH /admin/tenants/:id`; then `selectTenant()` refreshes JWT branding.

---

## Building UI components

### Do

- Use **semantic** Tailwind classes: `bg-primary`, `text-primary-foreground`, `hover:bg-primary-hover`, `bg-card`, `text-muted-foreground`, `border-border`, `hover:bg-hover`, `ring-focus`, `bg-backdrop`.
- Use `@repo/ui` primitives; they already follow this model.
- Use `cn()` from `@repo/theme/utils` for class merging.

### Avoid

- Hardcoding scale steps in shared components (`bg-primary-600`, `hover:bg-neutral-100`) — tenant palettes will not affect those styles.
- Setting one-off hex colors in app code for themeable surfaces.
- Custom overlay scrims — use `OverlayRoot` / `Modal` (`bg-backdrop`).

### Examples

```tsx
// Primary action
<Button variant="primary">Save</Button>
// → bg-primary text-primary-foreground hover:bg-primary-hover

// Muted helper text
<Text variant="muted">Optional field</Text>
// → text-muted-foreground

// Elevated surface
<div className="bg-card text-card-foreground border-border border rounded-lg p-4" />
```

### Input / focus aliases

Semantics expose component shortcuts consumed by `Input`:

- `border-input-border`, `bg-input-background`, `ring-input-focus` (alias of `--color-focus`)

---

## Programmatic API (`@repo/theme`)

| Export path | Use |
|-------------|-----|
| `@repo/theme/tenant-overrides` | `appearanceToCssVariables`, `TENANT_OVERRIDE_GROUPS`, palette helpers, presets |
| `@repo/theme/palette` | `generateColorScale`, `expandPaletteConfig` |
| `@repo/theme/react` | `ThemeProvider`, `useColorScheme`, `useDarkMode` |
| `@repo/theme/tokens.css` etc. | CSS entrypoints |

### Generate CSS variables from appearance

```ts
import { appearanceToCssVariables } from "@repo/theme/tenant-overrides";

const vars = appearanceToCssVariables({
  preset: "soft",
  palettes: {
    primary: { anchorStep: "500", anchorColor: "#1d4ed8" },
  },
});
// vars["--color-primary-500"], vars["--color-card"], …
```

### Overridable semantic tokens (editor + API)

Listed in `SEMANTIC_OVERRIDABLE_CSS_VARS` ([semantic-vars.ts](../packages/theme/src/semantics/semantic-vars.ts)):

`--color-background`, `--color-foreground`, `--color-primary`, `--color-primary-foreground`, `--color-primary-hover`, `--color-primary-active`, `--color-muted`, `--color-muted-foreground`, `--color-border`, `--color-border-muted`, `--color-card`, `--color-card-foreground`, `--color-popover`, `--color-popover-foreground`, `--color-backdrop`, `--color-hover`, `--color-active`, `--color-accent`, `--color-accent-foreground`.

Full semantic set (including success/warning/info) lives in [semantics.css](../packages/theme/src/semantics.css); only the subset above is exposed for tenant override in v1.

---

## Color scheme (light / dark)

User preference is stored in `localStorage` (`COLOR_SCHEME_KEY`) and applied as class `dark` on the root.

```tsx
import { ThemeProvider, useColorScheme } from "@repo/theme/react";

// root.tsx
<ThemeProvider defaultColorScheme="light">{children}</ThemeProvider>
```

Semantic tokens automatically switch via `dark.css`; tenant palette overrides on scale variables apply in both modes.

---

## Testing

| Command | Scope |
|---------|--------|
| `pnpm --filter @repo/theme test` | Palette generation, preset merge, semantics expansion |
| `pnpm test:visual` | Storybook screenshots (imports `semantics.css` via [storybook.css](../packages/ui/src/styles/storybook.css)) |

When changing default semantics or component variants, run visual tests and update Linux snapshots if intentional: `pnpm test:visual:update:ci`.

---

## Related files

| Area | Path |
|------|------|
| Theme package | [packages/theme/](../packages/theme/) |
| Shared type | [tenant-appearance.ts](../packages/shared-types/src/tenant/tenant-appearance.ts) |
| Branding provider | [TenantBrandingProvider.tsx](../apps/web/app/theme/TenantBrandingProvider.tsx) |
| Admin API | [admin.routes.ts](../apps/api/src/routes/admin.routes.ts) |
| E2E checks | [e2e-validation-runbook.md](./e2e-validation-runbook.md) §10 |

---

## Deferred (not in v1)

- Tenant-overridable success/warning/danger scales
- Gradients (`--gradient-primary`) and niche component tokens (e.g. story ring)
- `[data-theme="dark"]` — platform uses `.dark` only

See [StylesFeedback.md](../StylesFeedback.md) for the original token wishlist; implemented items are covered above.
