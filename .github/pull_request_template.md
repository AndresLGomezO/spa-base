## Description

Briefly describe the changes introduced by this PR.

## Apps/Packages Affected

### Apps

- [ ] `apps/web`
- [ ] `apps/api`

### Packages

- [ ] `packages/ui` (shared UI components + Storybook)
- [ ] `packages/shared-types`
- [ ] `packages/firestore-converters`
- [ ] `packages/gcp-firebase`
- [ ] `packages/eslint-config`
- [ ] `packages/typescript-config`
- [ ] `packages/theme`

### Root / shared config

- [ ] Root / shared config (specify: e.g. `turbo.json`, `pnpm-workspace.yaml`, `firestore.rules`, `.github/workflows/`)

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Other:

## How to Test

Describe the steps to verify the changes. Include any relevant environment setup or test commands.

1.
2.

## Checklist

- [ ] I have run `pnpm format` to ensure code style consistency.
- [ ] I have verified that `pnpm lint` and `pnpm typecheck` pass (if applicable).
- [ ] When adding or changing UI copy, I updated all locale files (`apps/web/app/i18n/locales/en` and `es`) with matching keys and ran `pnpm i18n:validate` (or confirmed `pnpm validate` passes).
- [ ] In `apps/web`, I used `@repo/ui` primitives (`Button`, `Heading`, `Text`, etc.) instead of raw `<button>`, `<h1>`–`<h3>`, or `<p>` (enforced by ESLint).
- [ ] If I changed `packages/ui`, I added/updated Storybook stories and confirmed `pnpm build-storybook` passes (or `pnpm storybook` for local review).
- [ ] My changes generate no new warnings.
- [ ] I have added tests that prove my fix is effective or that my feature works.
