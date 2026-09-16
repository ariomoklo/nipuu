On every pull request, run a **security pass first**. Do not lead with style, naming, or formatting. Oxfmt owns formatting; skip nits unless they hide a bug.

## Review structure

Start the review with a **Security** section. Either list security findings (severity, file, why it is a risk, how to fix) or write that no security issues were found and name what you checked.

Only after that section, mention correctness or tests if they matter.

## Always check

- Secrets, tokens, passwords, or private keys in source, fixtures, logs, or inspector output
- XSS: user or request data rendered as HTML (`innerHTML`, unescaped markup, unsafe `{@html}`)
- Prototype pollution or unsafe merges of `body`, `query`, or `params`
- Path traversal when resolving the user config file (`NIPUU_CONFIG`)
- Command injection, `eval`, or `import()` of paths other than the intended config file
- SSRF or unexpected outbound network from handlers
- Authorization mistakes if any admin or inspector surface grows
- Leaking `process.env` or other host secrets into mock responses or logs

## Nipuu-specific

Loading the user’s config JS at runtime is intended. Flag loading or executing files outside the resolved config path, or treating the inspector as a public internet app without stating that assumption.

## Priority

Security issues first. Then broken contract or tests. Do not flood the review with formatting.
