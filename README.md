# Nipuu

Nipuu is a mock API you run from a config file. You describe tables (`MODEL`) and HTTP routes (`ROUTE`). Nipuu keeps the data in memory, answers the routes, and shows traffic in an inspector.

```sh
npx nipuu ./mocks/index.mjs
```

- Mock API: `http://localhost:4210`
- Inspector: `http://localhost:4210/_nipuu`

Unmatched method and path pairs return `{ "error": "Not Found" }` with status 404. [PRESET](#preset) can override that body by method and status.

## Run

```sh
npx nipuu <config-file> [--port 4210] [--seed 10]
```


| Argument        | Default  | Meaning                                                                                            |
| --------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `<config-file>` | required | Path to an ESM file that exports `MODEL` and `ROUTE`. Resolved from the current working directory. |
| `--port`        | `4210`   | HTTP port.                                                                                         |
| `--seed`        | `10`     | How many rows to generate per model at start.                                                      |


The config path is required.

## Config file

```js
// nipuu.mjs
// run with `npx nipuu ./nipuu.mjs`

export const MODEL = { /* tables */ };
export const ROUTE = { /* HTTP routes */ };
export const PRESET = { /* optional: default responses by status */ };
```

`.mjs` is always treated as ESM, so this works in an empty directory. A `.js` config also works if that file sits in a package with `"type": "module"`. If `MODEL` or `ROUTE` is missing, Nipuu exits on startup. `PRESET` is optional.

### MODEL

Each key is a table name. The value is a function that receives a field builder `t` and returns the columns.

```js
export const MODEL = {
  users: (t) => ({
    id: t.id.uuid(),
    name: t.string().required().factory(({ index }) => `User ${index}`),
    email: t.string().required()
  }),
  todos: (t) => ({
    id: t.id.index(),
    title: t.string().required().factory(({ index }) => `Todo ${index}`),
    owner: t.id.uuid().required().rel('users', { field: 'id' }),
    completed: t.boolean().default(false)
  })
};
```

Field types:


| Call           | Stored as          |
| -------------- | ------------------ |
| `t.string()`   | string             |
| `t.boolean()`  | boolean            |
| `t.number()`   | number             |
| `t.id.index()` | 1-based integer id |
| `t.id.uuid()`  | UUID string        |


Modifiers, which you can chain in any order:


| Call                              | Meaning                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `.required()`                     | Must be present on create (`upsert`).                                                  |
| `.default(value)`                 | Used when the field is omitted.                                                        |
| `.factory(({ index }) => value)`  | Used when seeding. `index` is `1` through `--seed`.                                    |
| `.rel('table', { field, omit? })` | Points at another model's field. `omit` is an optional list of related fields to hide. |


The inspector uses `id.index` and `id.uuid` to find a row to edit or delete. Seed fills related tables first so foreign keys already exist.

### ROUTE

`ROUTE` nests path, then HTTP method, then handler.

Paths may include params (`/todos/:id`). Methods are HTTP verbs such as `GET`, `POST`, `PUT`, and `DELETE`.

A handler is a string or number, returned as `text/plain`, or an object with `action` and usually `model`.

Optional `delay` is milliseconds on **any HTTP method’s object handler** (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and so on). After that method’s action runs, Nipuu waits that long before returning. Inspector duration includes the wait. Shorthand string or number handlers stay instant. For a delayed static body, wrap it:

```js
GET: { action: 'static', response: 'Hello!', delay: 250 }
POST: { action: 'upsert', model: 'todos', delay: 250 }
```

Omitted, `0`, negative, `NaN`, or a non-number `delay` means no wait. Unmatched routes are still immediate 404.

```js
export const ROUTE = {
  '/': {
    GET: 'Hello!'
  },
  '/todos': {
    GET: { action: 'search', model: 'todos' },
    POST: { action: 'upsert', model: 'todos' }
  },
  '/todos/:id': {
    GET: {
      action: 'find',
      model: 'todos',
      where: { id: { source: 'params', key: 'id' } }
    }
  }
};
```

Actions:


| `action` | Needs `model` | What it does                                                                                                                                      |
| -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `static` | no            | Returns `response` as the body. Objects, arrays, and `null` are JSON. Other primitives are `text/plain`. A function or missing `response` is 500. |
| `search` | yes           | Lists matching rows.                                                                                                                              |
| `find`   | yes           | One row. Miss is 404.                                                                                                                             |
| `upsert` | yes           | Validates the JSON body and inserts or replaces. Invalid body is 400.                                                                             |
| `update` | yes           | Partial update. Miss is 404. Invalid body is 400.                                                                                                 |
| `delete` | yes           | Deletes matching rows. Miss is 404.                                                                                                               |


Unknown `action` or `model` is 400.

Field refs pull values from the request:

```js
{ source: 'params' | 'queries' | 'body', key: 'id', by: 'equal' }
```


| `source`  | From                |
| --------- | ------------------- |
| `params`  | Path params (`:id`) |
| `queries` | Query string        |
| `body`    | JSON object body    |


`by` is only used on `where` and `filter`:


| `by`              | Match           |
| ----------------- | --------------- |
| `equal` (default) | Exact match     |
| `include`         | String contains |


Query and param strings are coerced to the field type (booleans, numbers, ids).

`where` is required for `find`, `update`, and `delete`. On `search`, a missing `where` value returns an empty list instead of applying a partial match. `filter` is optional extra conditions on `search`. Missing query keys are skipped.

`sort` and `pagination` apply to `search` only:

```js
sort: {
  sortBy: { source: 'queries', key: 'sortBy' },
  orderBy: { source: 'queries', key: 'orderBy' } // `desc` for descending; anything else is ascending
},
pagination: {
  start: { source: 'queries', key: 'from' }, // slice start index, default 0
  end: { source: 'queries', key: 'to' },     // slice end index, default length
  limit: { source: 'queries', key: 'limit' }
}
```

On `update`, each field is a ref from the body, or a function of the current row:

```js
update: {
  title: { source: 'body', key: 'title' },
  completed: (todo) => !todo.completed
}
```

Omitted body keys are left unchanged.

On CRUD actions, `response` is optional. It runs after `PRESET` and receives the route context described below.

```js
response: ({ data, model }) => ({
  todos: data,
  total: data.length
})
```

If you omit `response`, Nipuu keeps the action body (or the PRESET body when one matched). Return a `Response` instead of a plain value to control the status, headers, and body yourself. A plain return is JSON at the incoming status, so a 404 mapper can return `{ error: '…' }` without wrapping `Response`.

```js
response: ({ data }) =>
  new Response(JSON.stringify(data), {
    status: 201,
    headers: { 'content-type': 'application/json', 'x-total': String(data.length) }
  })
```

### Response context

`PRESET` functions and ROUTE `response` functions share the same base fields. ROUTE also receives `response`.


| Key        | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| `data`     | The action result.                                                    |
| `model`    | The current store: plain rows, keyed by table name.                   |
| `status`   | The action status for PRESET; `response.status` after PRESET for ROUTE. |
| `method`   | Request method.                                                       |
| `path`     | Request path.                                                         |
| `params`   | Path params.                                                          |
| `queries`  | Query string.                                                         |
| `body`     | Request body.                                                         |
| `response` | The `Response` after PRESET. Only on ROUTE.                           |


### PRESET

`PRESET` is optional. It is a before-hook for the route mapper: after the action and `delay`, before `response()`. It matches **method then status**. Use it for a friendlier 404, a 5xx envelope, or a catch-all fallback. Path-specific bodies belong on the route's `response`.

`'*'` is the wildcard for method. Status keys are exact (`404`) or globs (`"5**"`, `"*"`). An exact method beats `'*'`. An exact status beats a glob, and a more specific glob beats `'*'`.

```js
export const PRESET = {
  '*': { '*': 'base default fallback', 404: { error: 'Nothing here' } },
  GET: {
    '5**': 'something went wrong',
    404: ({ path, params }) => ({ error: `${path} not found`, params })
  }
}
```

The config loader reads only the optional `PRESET` export.

A `*` / `*` leaf overrides every uncaught data-plane response (404, 200, 400, 500, unmatched, miss). Status stays the action status; only the body (or a returned `Response`) comes from the leaf. In the example above, `GET` 404 uses the function, `GET` 5xx uses `"5**"`, any other 404 uses `{ error: 'Nothing here' }`, and everything else falls through to `'base default fallback'`.

A leaf is a static value or a function, exactly like a route handler's `response`. There is no options object, so a preset cannot carry `delay`; the matched route's own `delay` still applies. A function receives the preset context (no `response`) and may return a `Response`.


| Leaf                  | Result                                                                     |
| --------------------- | -------------------------------------------------------------------------- |
| Object, array, `null` | JSON body, status from the action.                                         |
| Other primitive       | `text/plain` body, status from the action.                                 |
| Function              | Its return value is serialized the same way, unless it returns a `Response`. |
| Function → `Response` | Used as-is: its own status, headers, and body win.                         |


Resolution runs after the route action and after `delay`, on every data-plane response, then the route mapper runs. Never applies to the control plane.

## Inspector

Open `/_nipuu` while the server is running.

Requests lists every mock API call (not the inspector itself), with headers and bodies. Models lists seeded tables and lets you search, filter, create, edit, and delete rows.

Edits in the inspector change the in-memory tables. They are not written to your config file. Restarting the CLI reseeds from `--seed`.

## Maintainer

This repo is the Nipuu package. User APIs never live in SvelteKit route files. They come from the config at runtime. Architecture and conduct live in `docs/`.

```sh
npx . ./example/index.mjs
npm test
npm run test:mock
```

`npm test` is unit tests. `npm run test:mock` starts the CLI against `src/tests/` scenarios. A pre-commit hook runs `npm test`.

Pull requests to `main` must pass the `test`, `lint`, and `coverage` GitHub checks.

Publish a major or minor release by bumping `package.json` on a PR, merging, then tagging `vX.Y.0` on `main` (patch tags such as `v1.2.1` do not publish).

## License

Nipuu is licensed under the [MIT License](LICENSE).