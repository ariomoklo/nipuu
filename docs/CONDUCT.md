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

Read `docs/CONDUCT.md` and `docs/ARCHITECTURE.md` before changing architecture, routes, MODEL/ROUTE behavior, the CLI, the inspector, or documentation.

## Architecture rules

- Keep SvelteKit a two-plane host: control plane (`/_nipuu` and Vite/Kit internals) uses `resolve`; the data plane never uses `resolve`.
- `src/hooks.server.ts` only composes `sequence()`. Domain logic stays in `src/lib/server/**`.
- The client never imports `$lib/server`. Shared DTOs live in `src/lib/types/`.
- `App.Locals` is only `requestId` and `startedAt`.
- Do not implement features that `docs/` and `plans/` mark as future work (action execution, persistence, inspector styling, SSE) unless a later plan in `plans/` is being executed.

## Implementation rules

- Smallest change that matches the current contract.
- Always import project modules with `$lib/...` aliases. Never use relative imports (`./` or `../`). The only exception is SvelteKit-generated `./$types` in route files.
- Generated content is English only.
- Do not commit unless asked.
- Do not put planning notes in `docs/`.
