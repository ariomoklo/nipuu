# Nipuu architecture

Nipuu is a mock API CLI hosted by SvelteKit. User APIs are runtime data (`MODEL` + `ROUTE` from a config file). First-party UI is a real SvelteKit app. Domain logic never lives in `hooks.server.ts` or `+page.svelte`.

## Two-plane host

Treat SvelteKit as two planes, not as a file-router for user APIs.

- **Control plane** — `/_nipuu`, `/_app`, `/@…`, `/src`, `/node_modules`, and other Vite/SvelteKit internals. These call `resolve` and use the file router.
- **Data plane** — every other path. `handle` matches `ROUTE`, runs the route action, logs, and returns a `Response`. It never calls `resolve`.

Unmatched method/path pairs return **404** `{ "error": "Not Found" }`.

A catch-all `+server.ts` is the wrong layer: user routes are defined at runtime, `/` would still need a second entry point, and returning a `Response` from `handle` is the documented SvelteKit short-circuit.

## Request flow

```
cli.js → Vite / SvelteKit → hooks.server.ts (sequence)
  handleCors → handleControlPlane → handleDataPlane
```

`src/hooks.server.ts` only composes `sequence(handleCors, handleControlPlane, handleDataPlane)`. No matching, seeding, or JSON shaping belongs there.

1. **handleCors** — `OPTIONS` preflight and CORS headers on every outgoing response.
2. **handleControlPlane** — continues the sequence. Control-plane paths reach the file router; data-plane paths reach `handleDataPlane`.
3. **handleDataPlane** — if the path is control-plane, `resolve(event)`. Otherwise `initRuntime()` then `handleRequest(event)` always returns a `Response` (action result, static body, 400 validation, or 404).

`App.Locals` holds only `requestId` and `startedAt`. Do not put the store on `locals`.

## Inspector URL

SvelteKit treats directories that start with `_` as private modules, so `src/routes/_nipuu` cannot be a public route. Inspector files live at `src/routes/inspector`. `src/hooks.ts` `reroute` maps `/_nipuu` → `/inspector` for route matching only. `event.url` stays `/_nipuu`. The browser URL and poll target remain `/_nipuu` and `/_nipuu/logs`.

## Server-only runtime

All mutable process state lives under `src/lib/server/` and is imported only from hooks, `+page.server.ts`, and `+server.ts`. Import these modules with `$lib/server/...` aliases, never relative paths. The client must never import `$lib/server`.

Process-lifetime state (config, compiled schemas, tables, logs, field-schema registry) is stored on `globalThis` via `Symbol.for` so Vite HMR does not re-seed. Domain code is functions over plain data, not classes.

### File layout

- Singular untested files stay in the parent folder (`table/row.ts`). Do not wrap them as `table/row/row.ts`.
- A use case with a test file or multiple implementation files lives in a subdirectory (`table/filter/filter.ts`, `table/query/query.ts` + `parse.ts`).
- Module `index.ts` / `index.test.ts` stay at the module root and are the public barrel.
- Inspector UI uses component folders and `$lib/ui/shared/`; input-kind components live under `$lib/ui/input/`. Server barrels do not apply to `$lib/ui`.
- Unexported local functions sit at the top of a file; exported functions, objects, and variables sit at the bottom.

| Module | Role |
|---|---|
| `runtime/` | `initRuntime()` loads config, compiles MODEL, seeds tables. `handleRequest(event)` is the data-plane entry. Config and schemas live on `globalThis`. |
| `runtime/config.ts` | `pathToFileURL` + dynamic import of `NIPUU_CONFIG`. Fail fast if `MODEL` / `ROUTE` are missing. |
| `runtime/handle.ts` | Match `ROUTE`, dispatch, append a log. Body read/peek are unexported locals. |
| `model/` | `generateSchemas()`, field factory, `validate()`. Types in `types.ts`. No SvelteKit imports. |
| `table/` | In-memory `Table` map, seed, relation snapshots, `find` / `select` / `query` / `insert` / `update` / `deleteRow`. |
| `router/` | Parse `/todos/:id` patterns, match method + path, extract params. No SvelteKit imports. |
| `handlers/` | Dispatch `static` / `search` / `find` / `upsert` / `update` / `delete`. Validation runs inside mutating actions. |
| `logs.ts` | In-memory ring buffer: `appendLog` / `listLogs` / `getLog`. |
| `http/` | CORS, control-plane predicate, data-plane handle. |

Shared DTOs the inspector may import live in `src/lib/types/` (for example `LogEntry`). No store, no `fs`, no env reads there.

## Testing

Unit tests use Vitest (`npm test`, project `unit`). Config lives in `vite.config.ts`: `unit` includes `src/**/*.test.ts` except `src/tests/**`, `environment` is `node`. Colocate `*.test.ts` next to the module under test (for example `src/lib/server/model/index.test.ts` for compile, `src/lib/server/model/validate/validate.test.ts` for `validate()`, `src/lib/server/table/index.test.ts` for seed).

Mock-server scenario tests (`npm run test:mock`, project `mock`) live in `src/tests/`. They start the CLI and `fetch` HTTP. See `src/tests/README.md` for flow and scenarios.

`prepare` installs Husky. `.husky/pre-commit` runs `npm test`; a failing suite blocks the commit.

## Data plane

- Shorthand string or number handler → `text/plain` body.
- `action: "static"` → `response` as the body (JSON for records, arrays, and `null`; `text/plain` for other primitives). Functions and missing `response` are **500**.
- `search` / `find` / `upsert` / `update` / `delete` run against the in-memory table. `find` / `update` / `delete` miss is **404**. Unknown `action` or `model` is **400**.
- `upsert` (full) and `update` (partial) call `validate()`. Failure is **400** and does not write rows.
- Optional CRUD `response({ data, model })` maps the action result. `model` is the projected store.
- Every data-plane request is logged. Control-plane requests are not logged as mock API calls.

## CLI and npx

Usage: `nipuu <config-file> [--port 4210] [--seed 10]`

No `serve` subcommand. Default port is **4210**. Config path is required.

The CLI:

1. Resolves `<config-file>` against `process.cwd()` and sets `NIPUU_CONFIG`, `NIPUU_PORT`, `NIPUU_SEED`.
2. Starts Vite with `root` and `configFile` at the **nipuu package root** (`import.meta.url` → `src/cli.js` → `../..`), never cwd.
3. Initializes the runtime once after `listen` so a bad config fails before the first client call.

This package is shaped for `npx`:

- After publish: `npx nipuu ./mocks/index.mjs`
- In this repo: `npx . ./example/index.mjs`

`package.json` sets `"bin": { "nipuu": "./src/cli.js" }` and `"type": "module"`. Vite, Svelte, `@sveltejs/kit`, StyleX, Shiki, and inspector fonts are in **dependencies** (npx installs those only). This SvelteKit template keeps Kit options in `vite.config.ts` (no `svelte.config.js`). StyleX is compiled by `@stylexjs/unplugin` in that file.

## Inspector

- `src/routes/inspector/+layout.svelte` — Logs / Tables nav. Visual rules live in `docs/DESIGN.md`.
- `src/routes/inspector/+page.server.ts` — `load` returns the current log list.
- `src/routes/inspector/logs/+server.ts` — `GET` JSON for a ~1s client poll.
- `src/routes/inspector/+page.svelte` — request list. Each row links to `/_nipuu/requests/:id`. Never import `$lib/server` from the page.
- `src/routes/inspector/requests/[id]/+page.server.ts` — `load` returns `getLog(params.id)` and Shiki-highlighted JSON for headers and bodies. Unknown id is **404**.
- `src/routes/inspector/requests/[id]/+page.svelte` — request detail: Params / Query table plus highlighted JSON. Never import `$lib/server` from the page.
- `src/routes/inspector/tables/+page.server.ts` — `load` returns model summaries with row, property, and related-model counts.
- `src/routes/inspector/tables/[table]/+page.server.ts` — `load` queries a `Table` (search, typed filters, offset pagination); the `delete` action calls `deleteRow`. Unknown table is **404**. Search (`q`) and per-property filters are both query params, so the page reads its whole state from the URL.
- `src/routes/inspector/tables/[table]/new/+page.server.ts` — `load` returns the field metas; the default action validates and `insert`s, then redirects to the table.
- `src/routes/inspector/tables/[table]/edit/+page.server.ts` — `load` finds the row from identity query params (**400** without them, **404** when missing); the default action validates a partial payload and `update`s, then redirects to the table.
- All three loads also return `relations` from `relationOptions` — the existing values each relation field can point at, capped at 100 per field — so the inspector can offer a picker instead of a raw id box. The write actions run `resolveRelationLabels` over the form data first, turning a typed label back into the value it stands for.
- `src/routes/inspector/tables/+page.svelte`, `[table]/+page.svelte`, `[table]/new/+page.svelte`, `[table]/edit/+page.svelte` — table list, browser, and the two row forms. Never import `$lib/server` from a page.
- Inspector UI uses StyleX (`stylex.attrs`) and `$lib/ui` components. Tokens are `$lib/ui/shared/tokens.stylex.ts`.

Inspector table pages are control-plane (`/_nipuu/tables/...`). They call `initRuntime()` only to ensure seed ran, then use `getTable()` / `listTables()`. They never call `handleRequest()`, never match `ROUTE`, and are not appended to the mock request log.
