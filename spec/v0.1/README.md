# AgentTrace spec v0.1

AgentTrace is an open, framework-agnostic format for recording what AI agents do and why.

A `.atrace` file is a single JSON document that captures every decision, tool call, and reasoning step an agent took during a run. It is human-readable, diffable in git, and writable by any framework or hand-rolled agent.

---

## Why this exists

When an agent fails or behaves unexpectedly, developers have almost no visibility into what happened. Which step went wrong? What context did the model have at that moment? Why did it choose that tool? Existing observability tools log LLM API calls — but they don't understand *agent semantics*: goals, sub-tasks, decisions, retries, handoffs between agents.

AgentTrace gives agents a structured trace of their own reasoning. Once you have a standard format, everything else follows: a timeline viewer, a diff tool, a replay runner, a behavioural test harness. None of those exist well today. This format is the missing foundation.

---

## Design principles

**Readable without a library.** Open a `.atrace` file in any text editor and understand it in 30 seconds. No binary formats, no compression, no required parsers. If a field needs documentation to interpret, it should be renamed.

**Framework-agnostic.** The spec does not reference LangChain, CrewAI, AutoGen, or any specific model API. It describes *what happened*, not how it was built. A hand-rolled agent should emit the same format as one built on a framework.

**Additive versioning only.** Traces written against v0.1 must remain valid in all future v0.x versions. New fields are always optional. Fields are deprecated before removal, and only removed in a major version.

**Steps are the atom.** Each step records exactly one thing the agent did. No bundling multiple tool calls into one step. Granularity enables debugging. Coarseness destroys it.

**`meta` absorbs the unknown.** The root `meta` object and per-step `meta` objects accept arbitrary key-value pairs. Framework-specific data, cost estimates, custom tags — they go in `meta`. This prevents spec bloat while letting teams extend without forking.

---

## The format

A trace is a JSON object. The file extension is `.atrace`. Content-type is `application/json`.

### Minimal valid trace

```json
{
  "atrace": "0.1.0",
  "id": "trace_abc123",
  "agent": {
    "name": "my-agent"
  },
  "goal": "Summarise the latest news about electric vehicles",
  "status": "completed",
  "started_at": "2026-04-14T10:00:00Z",
  "ended_at": "2026-04-14T10:00:18Z",
  "steps": [
    {
      "id": "step_1",
      "type": "respond",
      "started_at": "2026-04-14T10:00:17Z",
      "content": "Here is a summary of the latest EV news..."
    }
  ]
}
```

---

## Root fields

| Field | Type | Required | Description |
|---|---|---|---|
| `atrace` | string | yes | Spec version. Always `"0.1.0"` for this version. |
| `id` | string | yes | Unique trace ID. Convention: `trace_` prefix + random alphanumeric. |
| `agent` | object | yes | Identifies the agent that ran. See [Agent object](#agent-object). |
| `goal` | string | yes | Plain English statement of what the agent was asked to do. |
| `status` | enum | yes | One of: `running`, `completed`, `failed`, `cancelled`. |
| `started_at` | ISO 8601 | yes | Wall clock time the run began. |
| `ended_at` | ISO 8601 | no | Wall clock time the run ended. Omitted if `status` is `running`. |
| `steps` | array | yes | Ordered list of every action the agent took. May be empty if the run ended immediately. |
| `parent_trace_id` | string | no | If this agent was spawned by another agent, the ID of the parent trace. Enables multi-agent tree reconstruction. |
| `meta` | object | no | Arbitrary key-value pairs. Token counts, framework name, custom tags. See [Meta](#meta). |

---

## Agent object

```json
"agent": {
  "name": "research-agent",
  "model": "claude-sonnet-4-20250514",
  "version": "1.2.0"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Human-readable agent name. Should be stable across runs of the same agent. |
| `model` | string | no | The LLM model identifier used. e.g. `"claude-sonnet-4-20250514"`, `"gpt-4o"`. |
| `version` | string | no | Agent code version. Useful for comparing behaviour across deploys. |

---

## Steps

The `steps` array is the core of the format. Each step records exactly one thing the agent did. Steps are ordered chronologically.

Every step has these base fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Unique step ID within this trace. Convention: `step_` prefix + integer or random. |
| `type` | enum | yes | The kind of action. One of: `think`, `tool_call`, `respond`, `handoff`, `error`. |
| `started_at` | ISO 8601 | yes | When this step began. |
| `ended_at` | ISO 8601 | no | When this step ended. Omitted for instantaneous steps. |
| `meta` | object | no | Arbitrary step-level metadata. |

### Step type: `think`

Internal reasoning. The agent thought before acting. No external call was made.

```json
{
  "id": "step_1",
  "type": "think",
  "started_at": "2026-04-14T10:00:01Z",
  "reasoning": "The user wants competitors. I should search for storytelling apps targeting anxious communicators, then cross-reference with app store data."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `reasoning` | string | yes | The agent's internal reasoning text. May be a direct chain-of-thought output or a developer-written summary. |

---

### Step type: `tool_call`

The agent invoked an external tool.

```json
{
  "id": "step_2",
  "type": "tool_call",
  "started_at": "2026-04-14T10:00:02Z",
  "ended_at": "2026-04-14T10:00:03Z",
  "tool": "web_search",
  "input": {
    "query": "storytelling app public speaking anxiety 2026"
  },
  "output": {
    "results": ["Orai", "Speeko", "Yoodli"]
  },
  "duration_ms": 1240,
  "error": null
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `tool` | string | yes | Tool name. Should match the tool's registered name in the agent's tool registry. |
| `input` | object | yes | The arguments passed to the tool. Schema is tool-specific. |
| `output` | any | no | The tool's return value. Null if the call errored. |
| `duration_ms` | number | no | Elapsed time of the tool call in milliseconds. |
| `error` | string | no | Error message if the tool call failed. Null or omitted on success. |

---

### Step type: `respond`

The agent produced a response — either a final answer or an intermediate message to the user.

```json
{
  "id": "step_5",
  "type": "respond",
  "started_at": "2026-04-14T10:00:40Z",
  "content": "Based on my research, the top 3 competitors for StorySpark are Orai, Speeko, and Yoodli.",
  "final": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | string | yes | The text of the response. |
| `final` | boolean | no | `true` if this is the terminal response of the run. Defaults to `false`. |

---

### Step type: `handoff`

The agent delegated work to a sub-agent. The sub-agent's full run is recorded in a separate trace, linked by ID.

```json
{
  "id": "step_3",
  "type": "handoff",
  "started_at": "2026-04-14T10:00:10Z",
  "to_agent": "web-scraper-agent",
  "task": "Scrape the pricing page for each of the 3 competitor apps",
  "child_trace_id": "trace_xyz789"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `to_agent` | string | yes | Name of the agent being delegated to. Should match the child trace's `agent.name`. |
| `task` | string | yes | Plain English description of what was delegated. |
| `child_trace_id` | string | no | The `id` of the child trace. Omitted if the child trace is not yet available. |

---

### Step type: `error`

Something went wrong. The agent encountered an error it could not recover from (or chose not to).

```json
{
  "id": "step_4",
  "type": "error",
  "started_at": "2026-04-14T10:00:35Z",
  "message": "Tool 'web_search' returned a 429 rate limit error after 3 retries",
  "code": "TOOL_RATE_LIMITED",
  "recoverable": false
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | yes | Human-readable error description. |
| `code` | string | no | Machine-readable error code. Convention: `SCREAMING_SNAKE_CASE`. |
| `recoverable` | boolean | no | Whether the agent could theoretically retry. Informational only. |

---

## Meta

The `meta` field at the root level (and on each step) accepts any key-value pairs. There are no reserved keys, but the following conventions are recommended for interoperability:

```json
"meta": {
  "total_tokens": 1842,
  "input_tokens": 420,
  "output_tokens": 1422,
  "total_cost_usd": 0.0048,
  "framework": "langchain",
  "framework_version": "0.3.1",
  "environment": "production",
  "tags": ["competitor-research", "weekly-report"]
}
```

Tools that read `.atrace` files should gracefully ignore unknown `meta` keys.

---

## Multi-agent traces

When an orchestrator agent delegates to sub-agents, each agent produces its own trace. Traces are linked via `parent_trace_id` and `handoff.child_trace_id`.

```
trace_root (orchestrator)
  └── step: handoff → child_trace_id: trace_child_1
  └── step: handoff → child_trace_id: trace_child_2

trace_child_1
  parent_trace_id: trace_root

trace_child_2
  parent_trace_id: trace_root
```

A viewer can reconstruct the full tree by following these links. Each trace is independently valid — you do not need the parent to understand a child trace.

---

## Versioning

This is `atrace` version `0.1.0`.

- **Patch** (0.1.x): Bug fixes to the spec text only. No schema changes.
- **Minor** (0.x.0): New optional fields added. All existing traces remain valid.
- **Major** (x.0.0): Breaking changes. Fields renamed or removed. Requires a migration.

All validators must accept traces from any minor/patch version within the same major version.

---

## FAQ

**Why JSON and not a binary format?**
Human readability is a first-class requirement. Developers should be able to open a trace in any editor, read it, and understand what happened. A binary format optimises for machines; this format optimises for debugging.

**Why not just use OpenTelemetry?**
OpenTelemetry is excellent for distributed systems tracing but was not designed for agent semantics. It has no native concept of `think`, `handoff`, or `goal`. AgentTrace is intentionally narrower — it models what agents do, not what services do.

**Can I add custom step types?**
Not in v0.1. If you need a custom step type, use `meta` on an existing step type to carry the additional data. Custom step types are under consideration for v0.2.

**Is this affiliated with any company?**
No. AgentTrace is an independent open standard. It is not maintained by Anthropic, OpenAI, or any framework vendor.

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md). The highest-value contributions right now are integration guides for LangChain, CrewAI, and AutoGen — showing developers how to emit `.atrace` files from their existing agents.

---

## License

The AgentTrace specification is released under [MIT License](../../LICENSE).
