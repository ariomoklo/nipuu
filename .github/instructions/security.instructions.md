---
applyTo: 'src/**'
---

When these files change, security is the first review pass.

- Request `body`, `query`, and `params` are untrusted. Watch for prototype pollution, unsanitized HTML in the inspector, and unsafe coercion.
- Do not execute or import files outside the resolved mock config path.
- Do not log secrets or dump `process.env`.
- Flag XSS in Svelte (`{@html}`, unsanitized JSON as HTML) and any new network or shell use.

If nothing is wrong, say so in a **Security** section and list what you checked.
