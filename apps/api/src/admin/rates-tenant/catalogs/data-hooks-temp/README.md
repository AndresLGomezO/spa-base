# Temporary / unused email data hooks

JSON here is **not** merged into the rates tenant seed (`seed-catalog-dir` only reads `data-hooks/`).

Moved out of seed when no active email-match binding needs the hook.

| File | Why archived |
|------|----------------|
| `email-ingest-ai.json` | All six local bindings use manual extract (`useAi: false`). Re-add when an AI binding is seeded. |
