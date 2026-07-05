# Keeping the manual aligned with AI context

The platform maintains two parallel documentation channels:

| Channel | Audience | Location |
|---------|----------|----------|
| **This manual** | Human designers | `docs/ui-design-manual/` |
| **AI context fragments** | Agents and import validators | `packages/ai-context/src/generated/` |

Both must describe the same JSON contracts. This page explains the sync workflow.

---

## Regenerating AI context

From the repository root:

```bash
pnpm generate:ai-context
```

This script:

1. Builds **static atoms** from TypeScript builders in `packages/ai-context/src/atoms/`.
2. Generates **schema-derived fragments** (component configs, surface allowlists) from `packages/ui-builder-core` and `packages/entities`.
3. Ingests **manual recipes** from `docs/ui-design-manual/07-recipes/*.md` (files with YAML frontmatter).
4. Writes fragment files to `packages/ai-context/src/generated/ui/` and `packages/ai-context/src/generated/model/`.
5. Computes a **manifest hash** over all fragment content and writes `packages/ai-context/src/generated/manifest.json`.

The manifest shape:

```json
{
  "versionHash": "abc123…",
  "fragments": {
    "ui.layout.base": "# UiLayoutDocument structure\n…",
    "ui.data-sources": "# Data sources\n…"
  }
}
```

`versionHash` changes whenever any fragment content changes. CI and tooling can compare hashes to detect drift.

---

## `@ai-context-sync` markers

Source files that define JSON contracts carry a sync comment:

```typescript
/**
 * @ai-context-sync
 * When changing design layout slice envelopes, run: pnpm generate:ai-context
 * Affected fragments: ui.surface.*
 */
```

Files with this marker today include layout types, component configs, styling types, design surfaces, motion presets, and design-layout-slice schema.

**When you change one of these files**, update the corresponding atom (if one exists) and run `pnpm generate:ai-context`.

---

## What to update where

| Change type | Update | Then run |
|-------------|--------|----------|
| Zod schema, TypeScript type, enum value | Atom builder in `packages/ai-context/src/atoms/` and/or generated from schema | `pnpm generate:ai-context` |
| Design guidance, prose, worked examples | This manual (`docs/ui-design-manual/`) | Optional: add recipe in `07-recipes/` |
| Step-by-step recipe for agents | `07-recipes/<name>.md` with frontmatter | `pnpm generate:ai-context` |
| Router / glossary only | `README.md` | No generation needed unless atoms reference it |

### Atoms (machine source of truth for contracts)

Atoms are compact, schema-accurate fragments. Examples:

| Atom ID | Built from |
|---------|------------|
| `ui.layout.base` | Layout hierarchy, grid rules |
| `ui.data-sources` | DataSource shapes and resolution |
| `ui.style-rules` | StyleRule attachment summary |
| `ui.responsive-visibility` | Breakpoint visibility |
| `ui.motion` | MotionPreset fields |
| `ui.metric-bindings` | Metric binding sources |
| `theme.style-rules` | Full style property enum |
| `ui.import.scopes` | Import scope types |
| `ui.presets.platform` | Built-in preset IDs |
| `ui.design-handbook.router` | Compact index pointing here |

### Manual (human source of truth for practice)

This manual expands atoms into:

- Decision trees and design rationale
- Full worked JSON examples
- Error troubleshooting
- Cross-topic navigation

**Rule of thumb:** if a validator or schema changed, fix the atom first, regenerate, then update the manual prose to match. If only design practice changed (e.g. a new card pattern), update the manual; add a recipe if agents should learn it.

---

## Manual recipes (`07-recipes/`)

Recipe files use YAML frontmatter so `pnpm generate:ai-context` includes them in the manifest:

```markdown
---
aiContextFragmentId: ui.recipe.card-list-two-track
title: Two-track card list
surfaces: [listItem]
---

# Two-track card list

Step-by-step instructions…
```

Required field: `aiContextFragmentId` (unique dot-notation ID).

Optional: `title`, `surfaces`.

The body becomes the fragment content (with an auto-generated `# title` header when `title` is set).

---

## Drift checklist

Before merging layout-system changes:

- [ ] Schema/types updated with `@ai-context-sync` comment where applicable
- [ ] `pnpm generate:ai-context` run locally; `manifest.json` hash updated
- [ ] Manual sections updated if user-facing behavior or examples changed
- [ ] New presets or surfaces reflected in `README.md` router table
- [ ] Recipe frontmatter IDs unique and surfaces accurate

---

## Fragment file naming

Generated files use kebab-case derived from atom IDs:

| Atom ID | File |
|---------|------|
| `ui.layout.base` | `ui-layout-base.md` |
| `theme.style-rules` | `theme-style-rules.md` |
| `ui.surface.mainPage` | `ui-surface-mainPage.md` |

Do not edit generated files by hand — they are overwritten on each run.
