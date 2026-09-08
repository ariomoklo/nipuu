# Conduct

Agents and contributors must follow `docs/` while working in this repository. `docs/` is the committed source of truth for this project, its code, and this conduct.

## Documentation layout

| Location | Committed? | What belongs there |
|---|---|---|
| `docs/` | Yes | This project, code information, and code of conduct |
| `plans/` | No (gitignored) | Planning docs for the next phase / future agent work |

- Planning documents **must** be placed in `plans/`.
- Planning documents **must not** be placed in `docs/`.
- Do not mix the two. Do not add RFCs, next-phase contracts, or “for the next agent” write-ups under `docs/`.

Read `docs/CONDUCT.md` and `docs/ARCHITECTURE.md` before changing architecture, routes, MODEL/ROUTE behavior, the CLI, the inspector, tests, or documentation.

## Architecture rules

- Keep SvelteKit a two-plane host: control plane (`/_nipuu` and Vite/Kit internals) uses `resolve`; the data plane never uses `resolve`.
- `src/hooks.server.ts` only composes `sequence()`. Domain logic stays in `src/lib/server/**`.
- The client never imports `$lib/server`. Shared DTOs live in `src/lib/types/`.
- `App.Locals` is only `requestId` and `startedAt`.
- Do not implement features that `docs/` and `plans/` mark as future work (action execution, persistence, inspector styling, SSE) unless a later plan in `plans/` is being executed.

## Functional style

- Prefer functions, plain data, and module-owned `globalThis` state over classes.
- Do not add classes, instance methods, or OOP hierarchies.
- Fluent MODEL field builders are factory functions that return new builder values, not class instances.
- Process-lifetime state (config, compiled schemas, tables, logs, field-schema registry) lives on `globalThis` via `Symbol.for`. Never put it on `App.Locals`. Never thread a god object through every call.

## File layout

Group utilities by use.

- A simple helper with no test colocates in the parent module: unexported next to the main function, or a sibling file in that folder. No dump `utils.ts`.
- A singular implementation file with **no test** stays in the parent folder (`src/lib/server/table/row.ts`). Do not wrap it as `table/row/row.ts`.
- If a use case has a test file, move it to a subdirectory (`table/filter/filter.ts` + `table/filter/filter.test.ts`).
- If a use case splits into multiple implementation files, move it to a subdirectory (`table/query/query.ts`, `table/query/parse.ts`, `table/query/query.test.ts`).
- Module `index.ts` and `index.test.ts` stay at the module root. Parent `index.ts` is the public barrel. Outside callers import `$lib/server/table`, not a deep path.
- In each file, put unexported local functions (and unexported types/constants they need) at the top. Put exported functions, objects, and variables at the bottom.

## Formatting

- After a closing `}` that ends a block, put a blank line before the next statement.
- Do not put a blank line between `}` and `else` / `catch` / `finally`, or immediately before a parent `}`.

```ts
export function resetTables() {
  const tables = getTables();
  for (const table of tables.values()) {
    destroy(table);
  }

  tables.clear();
  clearSchemas();
}
```

## Implementation rules

- Smallest change that matches the current contract.
- Always import project modules with `$lib/...` aliases. Never use relative imports (`./` or `../`). The only exception is SvelteKit-generated `./$types` in route files.
- Generated content is English only.
- Do not commit unless asked.
- Do not put planning notes in `docs/`.

## Testing

- Unit tests use Vitest. Run them with `npm test` (`vitest run`) or `npm run test:watch`.
- Colocate tests next to the module as `*.test.ts` (for example `src/lib/server/model/index.test.ts`).
- Vitest scans `src/**/*.test.ts`. Do not put unit tests outside `src/`.
- Tests import project modules with `$lib/...` aliases, same as production code.
- A Husky pre-commit hook runs `npm test`. The commit is rejected if tests fail. Do not skip the hook.
