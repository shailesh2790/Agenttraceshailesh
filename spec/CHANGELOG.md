# Changelog

All spec changes are documented here. Follows [semver](https://semver.org).

---

## [0.2.0] — 2026-04-14

### Added
- New step type: `memory` — records reads, writes, deletes, and searches on agent memory stores (`operation`, `store`, `key`, `value`, `query`, `results`, `duration_ms`, `error`)
- New step type: `loop` — container for iterative reasoning cycles; holds an ordered `iterations` array, each with an `index` and nested `steps` (`label`, `max_iterations`, `exit_reason`)
- New step type: `custom` — user-defined or framework-specific actions (`custom_type`, `data`)
- New root field: `input` — the raw prompt or input passed to the agent
- New root field: `tokens` — standardised token accounting (`input`, `output`, `cache_read`, `cache_write`, `total`); replaces the informal `meta.total_tokens` convention
- New base step field: `retry_of` — links a retry step to the ID of the step it is retrying
- New `respond` field: `format` — declares content format (`text`, `markdown`, `json`, `html`)
- Four new example traces: `memory-agent`, `react-loop`, `retry-with-backoff`, `custom-steps`
- JSON Schema at `spec/v0.2/schema.json`

### Changed
- Nothing. All v0.1 traces are valid against the v0.2 schema.

---

## [0.1.0] — 2026-04-14

Initial release of the AgentTrace specification.

### Added
- Root trace object with `atrace`, `id`, `agent`, `goal`, `status`, `started_at`, `ended_at`, `steps`, `parent_trace_id`, `meta`
- Five step types: `think`, `tool_call`, `respond`, `handoff`, `error`
- `meta` field at root and per-step for arbitrary extension
- JSON Schema at `spec/v0.1/schema.json`
- Four example traces: `minimal`, `tool-use`, `multi-agent`, `failed-run`
