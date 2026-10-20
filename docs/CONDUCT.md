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

Read `docs/CONDUCT.md` and `docs/ARCHITECTURE.md` before changing architecture, routes, MODEL/ROUTE behavior, the CLI, the inspector, tests, or documentation. Read `docs/DESIGN.md` before changing inspector UI, StyleX, or `$lib/ui`.

## Architecture rules

- One Node server. `isControlPlane` sends `/_nipuu` and Vite/Kit internals to Vite middleware. Every other path goes to the Effect HTTP app. The data plane never calls SvelteKit `resolve`.
- Domain logic stays in `src/lib/server/**`. `src/hooks.ts` only reroutes `/_nipuu` to `/inspector`.
- The client never imports `$lib/server`. Shared DTOs live in `src/lib/types/`.
- `App.Locals` is only `requestId` and `startedAt`.
- Do not implement features that `docs/` and `plans/` mark as future work (persistence, SSE) unless a later plan in `plans/` is being executed.
- Inspector UI follows `docs/DESIGN.md`. Do not invent tokens, type, or StyleX patterns.

## Effect conventions

- Services are `Context.Service` classes. Implement them as Layers in the module that owns them (`logs/`, `table/`). Wire Layers only in `AppLayer` (`src/lib/server/app/layer.ts`). Do not `Effect.provide` a Layer inside a request.
- Expected failures are tagged errors (`Data.TaggedError` or `Schema.TaggedError`) on the `E` channel. Domain code does not `throw` and has no `try/catch`. A broken invariant is a defect (`Effect.die`).
- `NodeRuntime.runMain` is the process entry. Inspector `load` / `+server.ts` and the sync adapters (`validate`, `dispatch`, `getTable`, log helpers, table lifecycle) may call `runAppSync`, `runAppPromise`, or `Effect.runSync` / `Effect.runPromise`. Do not add a new `run*` inside request handling, and do not `Effect.provide` a Layer per request.
- Domain effects do not use `try/catch`. `src/cli.js` may, because it only loads the Effect program.
- Time comes from `Clock` and `Effect.sleep`. Tests use `it.effect` from `@effect/vitest`, with test Layers and `TestClock`. Do not wait on the real clock in a unit test.
- Acquire servers, runtimes, and subscriptions with `Scope` / `Effect.acquireRelease` so interruption releases them.
- `class` is allowed only for `Context.Service`, `Data.TaggedError`, and `Schema.TaggedError`. No other classes, instance methods, or OOP hierarchies.
- Fluent MODEL field builders are factory functions that return new builder values, not class instances.
- Do not put config, model schemas, tables, or logs on `globalThis`. The field-schema registry (`Symbol.for('nipuu.schema')`) and the Shiki highlighter (`Symbol.for('nipuu.shiki')`) are the exceptions. Never put process state on `App.Locals`.

## File layout

Group utilities by use.

- A simple helper with no test colocates in the parent module: unexported next to the main function, or a sibling file in that folder. No dump `utils.ts`.
- A singular implementation file with **no test** stays in the parent folder (`src/lib/server/table/row.ts`). Do not wrap it as `table/row/row.ts`.
- If a use case has a test file, move it to a subdirectory (`table/filter/filter.ts` + `table/filter/filter.test.ts`).
- If a use case splits into multiple implementation files, move it to a subdirectory (`table/query/query.ts`, `table/query/parse.ts`, `table/query/query.test.ts`).
- Module `index.ts` and `index.test.ts` stay at the module root. Parent `index.ts` is the public barrel. Outside callers import `$lib/server/table`, not a deep path.
- Inspector UI is not a server barrel. Each component lives in its own folder (`$lib/ui/button/button.svelte` + colocated `button.style.ts`). Shared tokens, reset, helpers, and cross-component StyleX live under `$lib/ui/shared/`. Input-kind components live under `$lib/ui/input/`.
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
- Inspector UI imports are explicit files, not barrels: `$lib/ui/button/button.svelte`, not `$lib/ui` or `$lib/ui/button`. Input-kind components (`input`, `select`, `relation-input`, `field-control`, and future field controls) live under `$lib/ui/input/<name>/<name>.svelte`.
- Generated content is English only.
- Do not commit unless asked.
- Do not put planning notes in `docs/`.

## Testing

- Unit tests use Vitest. Run them with `npm test` (`vitest run --project unit`) or `npm run test:watch`.
- Colocate unit tests next to the module as `*.test.ts` (for example `src/lib/server/model/index.test.ts`).
- The Vitest `unit` project scans `src/**/*.test.ts` and excludes `src/tests/**`. Do not put unit tests outside `src/`.
- Unit tests import project modules with `$lib/...` aliases, same as production code.
- Mock-server scenario tests live in `src/tests/`. Run them with `npm run test:mock`. See `src/tests/README.md` for flow and scenarios.
- A Husky pre-commit hook runs `npm test`. The commit is rejected if tests fail. Do not skip the hook.
