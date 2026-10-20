# Nipuu architecture

Nipuu is a mock API CLI. User APIs are runtime data (`MODEL` + `ROUTE`, and optionally `PRESET` and `PLUGIN`, from a config file). The inspector is a SvelteKit app. Domain logic lives in `src/lib/server/**` and never in `+page.svelte`.

## Two-plane host

One Node HTTP server, one port. `isControlPlane` is the only split:

- **Control plane** — `/_nipuu`, `/_app`, `/@…`, `/src`, `/node_modules`, `/.svelte-kit`, `/__vite`, and `/virtual:stylex.css` / `/virtual:stylex.js` (the StyleX dev stylesheet and runtime). These go to Vite in `middlewareMode`, which serves the SvelteKit inspector.
- **Data plane** — every other path. The Effect HTTP app calls `handleRequestEffect`. It never touches Vite or SvelteKit.

Unmatched method/path pairs return **404** `{ "error": "Not Found" }`, unless `PRESET` matches that method and status.

A catch-all `+server.ts` is the wrong layer: user routes are defined at runtime.

## Request flow

```
src/cli.js
  → Node http.Server
       isControlPlane?  vite.middlewares  → SvelteKit inspector
       else             Effect HTTP app   → handleRequestEffect
```

`src/hooks.ts` only reroutes `/_nipuu` to `/inspector` for route matching. `event.url` stays `/_nipuu`. There is no `hooks.server.ts`.

CORS headers are set on every response, including the control plane. `OPTIONS` is **204** with an empty body. The header set is `Access-Control-Allow-Origin: *`, methods `GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD`, headers `Content-Type, Authorization`, and `Access-Control-Max-Age: 86400`.

`App.Locals` may only declare `requestId` and `startedAt`. The data plane does not write locals. The log entry carries the request id. Do not put the store on `locals`.

`handleRequestEffect` is `Effect.fn('nipuu.handleRequest')`. The steps, in order:

1. Read the body (JSON, raw text, or `null`) and build `DispatchContext`.
2. Match `ROUTE`. Unmatched paths are **404**.
3. Run the action, then `delay` when the handler has one.
4. Peek the body, apply `PRESET`, run the route `response` mapper, run `PLUGIN`.
5. Append a log from `Clock` on the way out, including when a later step fails. A throwing route `response` mapper is **500** `{ "error": "Invalid response" }` and is still logged.

## Inspector URL

SvelteKit treats directories that start with `_` as private modules, so `src/routes/_nipuu` cannot be a public route. Inspector files live at `src/routes/inspector`. `src/hooks.ts` `reroute` maps `/_nipuu` → `/inspector` for route matching only. `event.url` stays `/_nipuu`. The browser URL and poll target remain `/_nipuu` and `/_nipuu/logs`.

## Server-only runtime

All mutable process state lives under `src/lib/server/` and is imported only from hooks, `+page.server.ts`, and `+server.ts`. Import these modules with `$lib/server/...` aliases, never relative paths. The client must never import `$lib/server`.

The process `ManagedRuntime` is created from `AppLayer` in `src/lib/server/app/layer.ts` before the server listens. The CLI stores that runtime on the module in `src/lib/server/effect/runtime.ts` and copies it into `import.meta.hot.data` so an inspector reload keeps the same seeded process. Inspector `load` functions and the data plane both run effects on that runtime. Do not build a Layer per request.

`AppLayer` is `NipuuConfig` (load the config file) → `ModelSchemas` (`generateSchemas`) → a seeded `TableStore`, merged with `LogStore`. Config values come from a `ConfigProvider` (`NIPUU_CONFIG`, `NIPUU_PORT`, `NIPUU_SEED`), not from ad-hoc `process.env` reads in domain code.

The field-schema registry in `src/lib/server/table/schema.ts` still uses `Symbol.for('nipuu.schema')` on `globalThis`. The Shiki highlighter uses `Symbol.for('nipuu.shiki')`. Config, model schemas, tables, and logs do not.

### File layout

- Singular untested files stay in the parent folder (`table/row.ts`). Do not wrap them as `table/row/row.ts`.
- A use case with a test file or multiple implementation files lives in a subdirectory (`table/filter/filter.ts`, `table/query/query.ts` + `parse.ts`).
- Module `index.ts` / `index.test.ts` stay at the module root and are the public barrel.
- Inspector UI uses component folders and `$lib/ui/shared/`; input-kind components live under `$lib/ui/input/`. Server barrels do not apply to `$lib/ui`.
- Unexported local functions sit at the top of a file; exported functions, objects, and variables sit at the bottom.

| Module | Role |
|---|---|
| `app/` | `NipuuConfig`, `ModelSchemas`, and `AppLayer`. This is the only place Layers are wired together. |
| `effect/runtime.ts` | The process `ManagedRuntime`. `runAppSync` / `runAppPromise` are the inspector edge. |
| `runtime/config/` | `loadConfigEffect` imports `NIPUU_CONFIG`. Missing `MODEL` or `ROUTE` is `ConfigShapeInvalid`. `PRESET` and `PLUGIN` are optional. |
| `runtime/handle.ts` | `handleRequestEffect`: match, action, delay, preset, route mapper, plugins, log. |
| `model/` | `generateSchemas()`, field factory, Schema `validate()`. Types in `types.ts`. No SvelteKit imports. |
| `table/` | `TableStore` service, seed, relation snapshots, `find` / `select` / `query` / `insert` / `update` / `deleteRow`. |
| `router/` | Parse `/todos/:id` patterns, match method + path, extract params. No SvelteKit imports. |
| `preset/` | `applyPresetEffect` overrides a response body by method and status. Status keys may be exact or globs (`"5**"`, `"*"`). |
| `plugin/` | `runPluginsEffect` runs `PLUGIN` in index order after the route mapper. |
| `handlers/` | Dispatch `static` / `search` / `find` / `upsert` / `update` / `delete`. Validation runs inside mutating actions. Expected failures are tagged errors. |
| `logs/` | `LogStore` ring buffer. `appendLog` / `listLogs` / `getLog` read it through the runtime. |
| `http/` | CORS header set, `isControlPlane`, and the Effect data-plane app. |
| `cli/` | `effect/cli` command and the host that listens. `src/cli.js` is the Node launcher. |

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
- Optional CRUD `response(RouteContext)` maps the action result after `PRESET`. The shared base is `{ data, model, status, method, path, params, queries, body }`; ROUTE also gets `response` (the `Response` after PRESET). `data` is the action result. Returning a `Response` uses it as-is; any other value is JSON at `response.status`.
- Optional `delay` (milliseconds) on any HTTP method’s object handler waits after that method’s action and before the log. Shorthand string or number handlers cannot delay. Omitted, `0`, negative, or non-finite `delay` is no wait. Unmatched 404 is not delayed. Inspector `duration` includes the wait.
- Optional `PRESET` (`method → status → leaf`, `'*'` wildcard for method, status globs such as `"5**"`) runs after the action and after `delay`, before the route mapper, on every data-plane response. An exact method beats `'*'`, an exact status beats a glob, and `{ '*': { '*': leaf } }` is the catch-all for any uncaught method and status. A static leaf keeps the action status; a function leaf gets `PresetContext` (no `response`) and may return a `Response`. A function leaf that throws or rejects is **500** `{ "error": "Preset failed" }`; the cause is logged. Never applies to the control plane.
- Optional `PLUGIN` (an array of functions) runs last, after the route mapper, in index order, on every data-plane response including an unmatched 404. Each function gets `PluginContext`: the shared base without `data`, plus a required `response` (and `status`) that is the response the previous plugin produced. A returned `Response` is used as-is; any other value is JSON at the incoming status, so a plugin that returns nothing empties the body. Returning the incoming `response` is the pass-through. A non-function entry is **500** `{ "error": "Invalid plugin" }`. A function that throws or rejects is **500** `{ "error": "Plugin failed" }`; the cause is logged. Never applies to the control plane.
- Every data-plane request is logged. Control-plane requests are not logged as mock API calls.

## CLI and npx

Usage: `nipuu <config-file> [--port 4210] [--seed 10]`

No `serve` subcommand. Default port is **4210**. Config path is required.

`src/cli.js` is a plain Node launcher so `npx` needs no build. It `chdir`s to the package root (SvelteKit replaces Vite's `root` with the current directory), creates the Node server, starts Vite in middleware mode with `server.hmr.server` set to that server, and loads `src/lib/server/cli/main.ts`.

The command is `effect/cli`. `--port` must be an integer greater than 0 (default **4210**). `--seed` must be an integer greater than or equal to 0 (default **10**). `-h` and `--help` print the generated help and exit 0. A missing file prints `Config file not found: <path>` and `Usage: nipuu <config-file> [--port 4210] [--seed 10]`, then exits 1. A config that fails to import, or that does not export `MODEL` and `ROUTE`, prints the same message as `loadConfigEffect` and exits 1. A port already in use prints `Port <port> is already in use` and exits 1.

The parsed path, port, and seed are passed through a `ConfigProvider`. The runtime is built **before** `listen`. `NodeRuntime.runMain` owns the process. Ctrl+C interrupts the program, runs finalizers (HTTP server, then the runtime, then Vite), and exits **130**.

The CLI:

1. Resolves `<config-file>` against the working directory from before `chdir`.
2. Builds `AppLayer` and fails fast on a bad config.
3. Listens on the Node server. Control-plane paths go to `vite.middlewares`. Everything else goes to the Effect app.

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

Inspector table pages are control-plane (`/_nipuu/tables/...`). They read `TableStore` and `ModelSchemas` through the process runtime (`getTable()`, `listTables()`, `runAppSync`). They never call `handleRequestEffect`, never match `ROUTE`, and are not appended to the mock request log.
