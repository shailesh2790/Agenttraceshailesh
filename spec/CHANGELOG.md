# Changelog

All spec changes are documented here. Follows [semver](https://semver.org).

---

## [0.1.0] — 2026-04-14

Initial release of the AgentTrace specification.

### Added
- Root trace object with `atrace`, `id`, `agent`, `goal`, `status`, `started_at`, `ended_at`, `steps`, `parent_trace_id`, `meta`
- Five step types: `think`, `tool_call`, `respond`, `handoff`, `error`
- `meta` field at root and per-step for arbitrary extension
- JSON Schema at `spec/v0.1/schema.json`
- Four example traces: `minimal`, `tool-use`, `multi-agent`, `failed-run`
