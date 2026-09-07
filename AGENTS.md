# Agents

Follow `docs/` for this project. Start with `docs/CONDUCT.md` and `docs/ARCHITECTURE.md`.

- Planning documents go in `plans/` only. Never put planning docs in `docs/`.
- Cursor agents: load `.cursor/skills/nipuu-conduct/SKILL.md` (always-on via `.cursor/rules/nipuu.mdc`).
- Domain logic stays in `src/lib/server/**`. Inspector pages must not import `$lib/server`.
- Import project modules with `$lib/...` aliases, not relative paths (`./` or `../`). Exception: `./$types` in route files.
