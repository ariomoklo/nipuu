---
name: nipuu-conduct
description: Guides all work in the Nipuu repository — implementing features, planning, documentation, routes, MODEL/ROUTE config, the CLI, and the inspector. Use when working in this repo or changing architecture, virtual routes, server boundaries, or docs.
---

# Nipuu conduct

Before changing architecture, routes, MODEL/ROUTE behavior, the CLI, the inspector, tests, or documentation:

1. Read `docs/CONDUCT.md`
2. Read `docs/ARCHITECTURE.md`
3. Obey them strictly

## Rules

- `docs/` is committed project, code, and conduct documentation only.
- Write planning documents only under `plans/`.
- Never add planning docs to `docs/`.
- Keep domain logic in `src/lib/server/**`. Do not put it in `hooks.server.ts` or client pages.
- The client never imports `$lib/server`.
- Always import project modules with `$lib/...` aliases. Never use relative imports (`./` or `../`). The only exception is SvelteKit-generated `./$types` in route files.
- Unit tests: Vitest, colocated `*.test.ts` under `src/`. Vitest scans `src/**/*.test.ts`. Run `npm test`. Tests use `$lib/...` imports. Pre-commit runs `npm test` and must pass.
- Smallest implementation that matches the current contract. Do not build future work from `plans/` unless that plan is the task.
