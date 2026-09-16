# Nipuu

Nipuu is a mock API you run from a config file. You describe tables (`MODEL`) and HTTP routes (`ROUTE`). Nipuu keeps the data in memory, answers the routes, and shows traffic in an inspector.

```sh
npx nipuu ./mocks/index.mjs
```

- Mock API: `http://localhost:4210`
- Inspector: `http://localhost:4210/_nipuu`

Unmatched method and path pairs return `{ "error": "Not Found" }` with status 404.

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
```

`.mjs` is always treated as ESM, so this works in an empty directory. A `.js` config also works if that file sits in a package with `"type": "module"`. If either export is missing, Nipuu exits on startup.

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

On CRUD actions, `response` is optional. `data` is the action result. `model` is the current store (plain rows, keyed by table name).

```js
response: ({ data, model }) => ({
  todos: data,
  total: data.length
})
```

If you omit `response`, Nipuu returns the row or list as JSON.

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