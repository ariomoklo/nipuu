# Nipuu architecture

Nipuu is a mock API CLI hosted by SvelteKit. User APIs are runtime data (`MODEL` + `ROUTE` from a config file). First-party UI is a real SvelteKit app. Domain logic never lives in `hooks.server.ts` or `+page.svelte`.

## Two-plane host

Treat SvelteKit as two planes, not as a file-router for user APIs.

- **Control plane** — `/_nipuu`, `/_app`, `/@…`, `/src`, `/node_modules`, and other Vite/SvelteKit internals. These call `resolve` and use the file router.
- **Data plane** — every other path. `handle` matches `ROUTE`, stubs or returns a static body, logs, and returns a `Response`. It never calls `resolve`.

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
3. **handleDataPlane** — if the path is control-plane, `resolve(event)`. Otherwise `getRuntime().handle(event)` always returns a `Response` (200 stub, static body, 400 validation, or 404).

`App.Locals` holds only `requestId` and `startedAt`. Do not put the store on `locals`.

## Inspector URL

SvelteKit treats directories that start with `_` as private modules, so `src/routes/_nipuu` cannot be a public route. Inspector files live at `src/routes/inspector`. `src/hooks.ts` `reroute` maps `/_nipuu` → `/inspector` for route matching only. `event.url` stays `/_nipuu`. The browser URL and poll target remain `/_nipuu` and `/_nipuu/logs`.

## Server-only runtime

All mutable process state lives under `src/lib/server/` and is imported only from hooks, `+page.server.ts`, and `+server.ts`. Import these modules with `$lib/server/...` aliases, never relative paths. The client must never import `$lib/server`.

| Module | Role |
|---|---|
| `runtime/` | `initRuntime()` / `getRuntime()` — load config, compile MODEL, seed, hold router + logs. Singleton on `globalThis` so Vite HMR does not re-seed. Request body and mutating-validation helpers live in `utils.ts`. |
| `config.ts` | `pathToFileURL` + dynamic import of `NIPUU_CONFIG`. Fail fast if `MODEL` / `ROUTE` are missing. |
| `model/` | Fluent factory, compile, `validate()`. Types in `types.ts`. No SvelteKit imports. |
| `table/` | In-memory `TableStore` map, seed, relation snapshots, select/find projection. |
| `router/` | Parse `/todos/:id` patterns, match method + path, extract params. No SvelteKit imports. |
| `handlers/` | MVP stub/static dispatcher. Future CRUD actions land here without changing hooks. |
| `logs.ts` | In-memory ring buffer. |
| `http/` | CORS, control-plane predicate, data-plane handle. |

Shared DTOs the inspector may import live in `src/lib/types/` (for example `LogEntry`). No store, no `fs`, no env reads there.

## Testing

Unit tests use Vitest (`npm test`). Config lives in `vite.config.ts`: `include` is `src/**/*.test.ts`, `environment` is `node`. Colocate `*.test.ts` next to the module under test (for example `src/lib/server/model/index.test.ts` for compile and `validate()`, `src/lib/server/table/index.test.ts` for seed and relations).

`prepare` installs Husky. `.husky/pre-commit` runs `npm test`; a failing suite blocks the commit.

## MVP data plane

- Config value is a string or number → `text/plain` body (`GET /` = `Hello!`).
- Config value is an object → **200** stub `{ _nipuu: { matched, action, model, params, queries } }`.
- `POST` (full) and `PUT` (partial) with a `model` run `validate()`. Failure is **400** and does not write rows.
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

`package.json` sets `"bin": { "nipuu": "./src/cli.js" }` and `"type": "module"`. Vite, Svelte, and `@sveltejs/kit` are in **dependencies** (npx installs those only). This SvelteKit template keeps Kit options in `vite.config.ts` (no `svelte.config.js`).

## Inspector

- `src/routes/inspector/+page.server.ts` — `load` returns the current log list.
- `src/routes/inspector/logs/+server.ts` — `GET` JSON for a ~1s client poll.
- `src/routes/inspector/+page.svelte` — master/detail logs. Never import `$lib/server` from the page.
- `src/routes/inspector/tables/+page.server.ts` — `load` returns seeded table names via `listTables()`.
- `src/routes/inspector/tables/[table]/+page.server.ts` — `load` queries `TableStore` (search, typed filters, offset pagination); form actions `create` / `update` / `delete` call `insert` / `update` / `delete`. Unknown table is **404**.
- `src/routes/inspector/tables/+page.svelte` and `src/routes/inspector/tables/[table]/+page.svelte` — table list and unstyled browser. Never import `$lib/server` from the page.

Inspector table pages are control-plane (`/_nipuu/tables/...`). They call `initRuntime()` only to ensure seed ran, then use `getTable()` / `listTables()`. They never call `Runtime.handle()`, never match `ROUTE`, and are not appended to the mock request log.
