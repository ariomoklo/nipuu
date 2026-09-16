# Design

Nipuu Inspector is a local mock-API console. Its job is to make HTTP traffic and seeded tables readable at a glance. The visual language is the protocol: methods, paths, status, JSON — not dashboard chrome.

Follow this document for all inspector UI, StyleX, and `$lib/ui` work.

## Direction

- **shadcn token names**, sky as primary. Not a Tailwind/shadcn component dump.
- **Minimalism:** type and whitespace. No dashboard cards or shadows. Icons are Heroicons outline, inlined in `$lib/ui/icon/icon.svelte`, and only stand in for a repeated row action or a control the toolbar has no room to spell out. Never emoji, never a second icon set. Request JSON uses a bordered terminal frame with source line numbers and a Copy control. Path params and query use the same bordered frame with Params / Query tabs and a Key / Value table. Request log rows use that same bordered frame.
- **Light + dark** via `prefers-color-scheme` only. No theme toggle.
- **Signature:** HTTP method in display type (weight 800). Sky marks current nav, JSON keys, param and query keys, 2xx status, hover/focus on a request row, an active filter funnel, and a 4ch bar under the page title. 4xx/5xx status uses danger.

## Tokens

Defined in `$lib/ui/shared/tokens.stylex.ts` (`stylex.defineVars`). Do not invent new colors or fonts.

| Token | Light | Dark |
|---|---|---|
| background (Paper) | `#F7FAFC` | `#0B1220` |
| foreground (Ink) | `#0B1220` | `#F8FAFC` |
| primary (Sky) | `#0284C7` | `#38BDF8` |
| primaryForeground | `#FFFFFF` | `#0B1220` |
| accent (Sky wash) | `#E0F2FE` | `#082F49` |
| mutedForeground (Mute) | `#64748B` | `#94A3B8` |
| border / input (Line) | `#E2E8F0` | `#1E293B` |
| overlay (Scrim) | `rgb(11 18 32 / 0.4)` | `rgb(2 6 16 / 0.6)` |
| destructive (Danger) | `#DC2626` | `#F87171` |
| ring | same as primary | same as primary |
| radius.control | `0.25rem` | `0.25rem` |

Sky is the only chromatic color besides danger.

### Type

| Role | Face | Use |
|---|---|---|
| Display | Bricolage Grotesque Variable 800 | Page titles and HTTP methods only |
| Body | Source Sans 3 400 / 600 | UI copy, labels, nav |
| Data | IBM Plex Mono 400 | Paths, JSON, table cells, timestamps |

Scale: display `2.5rem`, title `1.25rem`, body `1rem`, label/mono `0.8125rem`. Buttons and code-block titles use label.

### Space

`xs` 0.25rem · `sm` 0.5rem · `md` 1rem · `lg` 1.5rem · `xl` 2.5rem · `xxl` 4rem.

Outer frame is wide (`max-width: 72rem`) with large padding. Request logs and model summaries are single-column lists of bordered frames. A model frame stacks the model name over one mono meta line joined by `・`: rows, properties, and related models.

## StyleX

- Tokens only in `*.stylex.ts` via named `stylex.defineVars` exports. No other exports in those files. Do not name a token group `type` (`import { type }` is TypeScript type-only syntax).
- `stylex.create` lives at module top level in colocated `*.style.ts` files and `$lib/ui/shared/**`.
- Apply styles with `{...stylex.attrs(...)}`. Never `stylex.props` (`className` is React).
- Do not add Svelte `<style>` on inspector UI. Scoped CSS fights StyleX layers.
- `$lib/ui/shared/reset.css` is wrapped in `@layer reset`, declared before the StyleX priority layers. Unlayered CSS beats every layer, so element rules there (`button { font: inherit }`, `pre`, `a`) would silently outrank StyleX. Keep new global CSS inside that layer.
- Only static values inside `stylex.create`. Tokens from `*.stylex.ts` are the allowed exception.
- Import UI modules as explicit `$lib/ui/...` files, never relative paths and never a `$lib/ui` barrel. Input-kind components live under `$lib/ui/input/<name>/<name>.svelte`.

Vite: `@stylexjs/unplugin` in `vite.config.ts` after `sveltekit()`, `useCSSLayers: { before: ['reset'] }`, `$lib` alias. Root layout imports `$lib/ui/shared/reset.css` and, in dev, `/virtual:stylex.css` plus `virtual:stylex:runtime`. StyleX packages stay in `dependencies` so `npx nipuu` can compile the inspector.

## Components

Client UI under `src/lib/ui/`. Never import `$lib/server`. `$lib/ui/shared/shiki/highlight.ts` is imported from `+page.server.ts` so Shiki stays off the client. Each component folder holds `<name>.svelte` and colocated `<name>.style.ts`. Shared tokens, reset, helpers, picker wrapper, icon-button, sheet, text-link, and inspector chrome styles live under `$lib/ui/shared/`.

| File | Role |
|---|---|
| `button/button.svelte` | `primary` / `ghost` / `destructive` |
| `input/input/input.svelte` | Native input |
| `input/select/select.svelte` | Native select in the `field` wrapper, with a chevron marker |
| `label/label.svelte` | Stacked label + control |
| `input/field-control/field-control.svelte` | Input, select, or relation picker for one `TableFieldMeta`, shared by filter and row forms |
| `input/relation-input/relation-input.svelte` | Relation picker: combobox that searches existing values and posts the one behind the label |
| `icon/icon.svelte` | Inlined Heroicons outline paths: `pencil`, `trash`, `plus`, `chevronDown`, `funnel`, `close` |
| `table/table.svelte` | Table root; `th` / `td` use colocated `table.style.ts` |
| `nav-link/nav-link.svelte` | Header nav; `current` is sky |
| `code-block/code-block.svelte` | Terminal frame for JSON: section title (`h2`) and Copy in the header, Shiki tokens, line numbers |
| `param-tabs/param-tabs.svelte` | Params / Query tabs and Key / Value table on request detail |

Reuse these. Do not add Popover, a combobox library, or an icon package; the one combobox is `relation-input.svelte`, built on the ARIA pattern, and new icons are Heroicons outline paths added to `icon.svelte`. Overlays are limited to two: the filter sheet, a native `<dialog>`, and that combobox list, positioned under its own field. Do not reach for a modal or positioning library. JSON highlighting uses **Shiki** (`$lib/ui/shared/shiki/highlight.ts`) with custom light/dark themes that reuse the token hexes (keys sky, strings/numbers ink, literals and punctuation mute). Do not add Prism or highlight.js. Highlight on the server in `load` so the client does not bundle Shiki.

Table browser (`tables/[table]`): a mono meta line under the title, then a toolbar of two controls — a search field and a funnel icon button — then one line per row. Search and property filters are separate: search is always visible and navigates on input after a 250ms debounce (`goto` with `keepFocus`, `noScroll`, `replaceState`), while the per-property filters live behind the funnel because they depend on the model's fields. The funnel turns sky when filters are active and its `aria-label` carries the count. Both controls sit in GET forms so they still work without JS.

The filter form lives in a right sheet: a `<dialog>` opened with `showModal()`, pinned to the inline end at `min(26rem, 100vw)`, scrim from the `overlay` token via `::backdrop`. Header is an uppercase `Filter` label plus a close icon; the field grid scrolls; `Apply` sits in a bordered footer at the bottom. Closing returns focus to the funnel, and Escape and backdrop clicks close it. Apply submits through a handler that drops empty fields so the URL carries only real filters.

The filter grid is one control pair per field (`auto-fit minmax(14rem, 1fr)`), and the row list follows. The row list stays a list — never an inline form. The `Actions` cell holds two icon controls only: a pencil linking to `tables/[table]/edit?<identity>` and a trash submitting `?/delete`, each with a `title` and an `aria-label` naming the row. The last table row is a full-width plus link to `tables/[table]/new`. Section labels and `th` are uppercase label type with `0.08em` tracking. Cells truncate at `24ch` and carry the full value in `title`; an empty cell is an em dash in mute.

Row forms (`tables/[table]/edit`, `tables/[table]/new`) are their own pages: a back link, `h1` plus title mark, a mono meta line, then one field per row stacked in a single 24rem column, and one action. Edit reads its row from identity query params and posts hidden identity fields. Both redirect to the table on success.

A relation field is a picker, not a bare id box. `field-control.svelte` renders `relation-input.svelte` when the load supplied options for the field. The visible input shows the related row's label (its first string field) and reads `Search <table>` when empty; a hidden input posts the value behind it, so a typed id still submits as itself. Typing narrows the list on either the label or the value; `ArrowDown` / `ArrowUp` walk it and scroll the highlight into view, `Enter` picks, `Escape` closes the list only — never the sheet around it. The list sits directly under the field at the field's width, one option per line with the label in body type and the value in mono mute, truncated with the full value in `title`. Both row forms also swap a typed label for the value it stands for before validating, so a name is as good as an id.

Every picker control looks the same: the `field` styles wrap it, a `chevronDown` Heroicon marks it at the inline end, and the control reserves `PICKER_INSET` of end padding. On a select the marker is decorative; on the combobox it is a `tabindex="-1"` button that opens the list. Never ship a bare `<datalist>` — the browser popup cannot be positioned or styled to match.

Inspector chrome: `src/routes/inspector/+layout.svelte` (Logs / Tables on the left). Pages own their `h1` plus the sky title mark. Request detail uses **Back to previous** to return to the list. Request meta uses native `title` tooltips. The timestamp shows relative time; the ISO value is in the tooltip.

## Copy

Sentence case. Name the action: **Apply**, **Save**, **Create**, **Delete**. Empty states say what to do next. Errors name the failure; they do not apologize.

## Do not

- Cream / terracotta palettes, black + acid green, or broadsheet hairline grids
- Dashboard cards, shadows, decorative numbering, or an icon next to every label
- Emoji anywhere in the UI, and any icon set other than Heroicons outline
- New accent colors or display fonts
- `stylex.props`, Svelte scoped styles, or relative UI imports
- Dark-mode toggles
