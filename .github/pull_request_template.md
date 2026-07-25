## Description

Briefly describe the changes introduced by this PR.

Link related issues with `Fixes #n` / `Refs #n`. Prefer real GitHub issues on the **ESP Platform — Delivery** project with labels: `type:*`, `priority:P*`, `app:*`, `area:*`.

## Apps/Packages Affected

- [ ] `api`
- [ ] `web`
- [ ] `platform`
- [ ] `worker-service`
- [ ] `worker-aggregation`
- [ ] `worker-indexer`
- [ ] `packages/*` (specify: )
- [ ] `packages/infrastructure` (Terraform)
- [ ] `.github/workflows` / CI

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Infrastructure / CI
- [ ] Other:

## How to Test

Describe the steps to verify the changes. Include any relevant environment setup or test commands.

1.
2.

## Checklist

- [ ] I have run `pnpm format` to ensure code style consistency.
- [ ] I have verified that `pnpm lint` and `pnpm typecheck` pass (if applicable).
- [ ] If web i18n strings changed: I ran `pnpm i18n:validate`.
- [ ] My changes generate no new warnings.
- [ ] I have added tests that prove my fix is effective or that my feature works.
- [ ] Linked issue(s) use the project labels / fields (Type, Priority, App, Area) when applicable.
- [ ] If Terraform changed: I ran `terraform fmt` and reviewed plan impact for dev/staging/prod.
