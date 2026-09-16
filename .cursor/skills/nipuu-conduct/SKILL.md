---
name: nipuu-conduct
description: Guides all work in the Nipuu repository — implementing features, planning, documentation, routes, MODEL/ROUTE config, the CLI, and the inspector. Use when working in this repo or changing architecture, virtual routes, server boundaries, or docs.
---

# Nipuu conduct

Before changing architecture, routes, MODEL/ROUTE behavior, the CLI, the inspector, tests, or documentation:

1. Read `docs/CONDUCT.md`
2. Read `docs/ARCHITECTURE.md`
3. Read `docs/DESIGN.md` when the work touches inspector UI, StyleX, or `$lib/ui`
4. Obey them strictly

## Rules

- `docs/` is committed project, code, and conduct documentation only.
- Write planning documents only under `plans/`.
- Never add planning docs to `docs/`.
- Keep domain logic in `src/lib/server/**`. Do not put it in `hooks.server.ts` or client pages.
- The client never imports `$lib/server`.
- Always import project modules with `$lib/...` aliases. Never use relative imports (`./` or `../`). The only exception is SvelteKit-generated `./$types` in route files.
- Inspector UI: import explicit files (`$lib/ui/button/button.svelte`). Input-kind components live under `$lib/ui/input/<name>/<name>.svelte`.
- Unit tests: Vitest, colocated `*.test.ts` under `src/`. Run `npm test` (`--project unit`). Tests use `$lib/...` imports. Pre-commit runs `npm test` and must pass.
- Mock-server scenario tests: `src/tests/`. Run `npm run test:mock`. See `src/tests/README.md`.
- Smallest implementation that matches the current contract. Do not build future work from `plans/` unless that plan is the task.
- Prefer functions, plain data, and `globalThis` process state over classes. Do not add classes or OOP hierarchies. Fluent MODEL builders are factory functions, not class instances.
- File layout: singular untested files stay in the parent folder. A use case with a test file or multiple implementation files gets a subdirectory. Module `index.ts` / `index.test.ts` stay at the module root. Inspector UI uses component folders and `$lib/ui/shared/`; input-kind components live under `$lib/ui/input/`.
- In a file, unexported local functions go at the top; exported functions, objects, and variables go at the bottom.
- After a closing `}` that ends a block, put a blank line before the next statement. Do not put a blank line between `}` and `else` / `catch` / `finally`, or immediately before a parent `}`.
