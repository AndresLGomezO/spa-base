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

When UI changes are intentional:

```bash
pnpm build-storybook
pnpm test:visual:update
```

Commit the updated PNG files under `stories.visual.spec.ts-snapshots/`.

## Notes

- CI uses Chromium only with `globals=theme:light` for consistent snapshots.
- Visual tests serve `storybook-static` on port **6007** (dev Storybook stays on **6006**).
- Visual tests run in the GitHub `storybook` job, not in `pnpm validate`.
