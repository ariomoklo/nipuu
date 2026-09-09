# Nipuu

Mock API CLI. Load `MODEL` and `ROUTE` from a config file, keep tables in memory, match virtual routes, and inspect request logs at `/_nipuu`.

## Run

From this repo:

```sh
npx . ./example/index.mjs
```

Options:

```sh
npx . ./example/index.mjs --port 4210 --seed 10
```

After publish:

```sh
npx nipuu ./mocks/index.mjs
```

Open `http://localhost:4210/_nipuu` for the inspector. All other paths are the mock API.

## Test

```sh
npm test
npm run test:mock
```

`npm test` runs colocated unit tests. `npm run test:mock` runs mock-server HTTP scenarios in `src/tests/`. See `src/tests/README.md`. A pre-commit hook runs `npm test`; the commit is rejected if tests fail.
