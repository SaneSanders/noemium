# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for security problems.

- Preferred: open a private report via
  [GitHub Security Advisories](https://github.com/SaneSanders/noemium/security/advisories/new).
- Alternative: DM [@whysanesanders](https://x.com/whysanesanders) on X.

We aim to acknowledge reports within 72 hours.

## Scope

Noemium is a static site: content (YAML/Markdown) is rendered at build time
and there is no server-side user input. The main attack surface is **content
PRs as untrusted input** — a malicious entry must not be able to inject
markup, scripts or non-https links into the built site. Issues in scope:

- Stored XSS via content fields (tool names, taglines, receipts, JSON-LD).
- Schema bypasses that let disallowed URL schemes (`javascript:`, `data:`)
  into rendered links.
- CI/CD workflow abuse (script injection through PR-controlled input).

## Not considered vulnerabilities

- Content accuracy disputes (wrong price, stale verdict) — open a normal PR.
- Vulnerabilities in third-party services we merely link to.
- Self-XSS, or issues requiring the victim to run untrusted code locally.
- Missing best practices (headers, CSP tuning) without a demonstrated
  exploit — suggestions are welcome as regular issues.
