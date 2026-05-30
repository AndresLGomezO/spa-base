# Visual regression tests

Playwright screenshots every Storybook story from the built static catalog.

## Prerequisites

```bash
pnpm test:visual:install   # once per machine / after @playwright/test upgrades
pnpm build-storybook
```

## Run tests

```bash
pnpm test:visual
```

## Update baselines

When UI changes are intentional, **regenerate snapshots on Linux** (same OS as GitHub CI):

```bash
pnpm test:visual:update:ci
```

Requires Docker. This avoids macOS vs Linux font-rendering drift in committed PNGs.

For quick local iteration only (may not match CI):

```bash
pnpm build-storybook
pnpm test:visual:update
```

Commit the updated PNG files under `stories.visual.spec.ts-snapshots/`.

## Notes

- CI uses Chromium on `ubuntu-latest` with `globals=theme:light`.
- Storybook loads `@repo/theme/tokens.css`, `semantics.css`, and `dark.css` via [src/styles/storybook.css](../../src/styles/storybook.css). Visual baselines reflect the semantic token layer (`bg-primary`, `bg-card`, etc.).
- Visual tests serve `storybook-static` on port **6007** (dev Storybook stays on **6006**).
- Visual tests run in the GitHub `storybook` job, not in `pnpm validate`.
- Baselines are authoritative for **Linux CI**; use `test:visual:update:ci` before committing snapshot changes.
