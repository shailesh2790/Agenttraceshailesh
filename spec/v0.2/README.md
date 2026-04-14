# AgentTrace spec v0.2

AgentTrace is an open, framework-agnostic format for recording what AI agents do and why.

A `.atrace` file is a single JSON document that captures every decision, tool call, memory operation, and reasoning step an agent took during a run. It is human-readable, diffable in git, and writable by any framework or hand-rolled agent.

All traces valid against v0.1 are valid against v0.2. This version adds new optional fields and two new step types.

---

## What changed in v0.2

- **New step type: `memory`** — records reads, writes, and deletes to agent memory stores
- **New step type: `loop`** — records iterative reasoning cycles (ReAct, MCTS, retry loops)
- **New step type: `custom`** — framework-specific or user-defined step types
- **New root field: `input`** — the raw prompt or input given to the agent
- **New root field: `tokens`** — standardised token accounting at the trace level
- **New base step field: `retry_of`** — links a retry attempt back to the step it is retrying
- **New `respond` field: `format`** — declares the content format (`text`, `markdown`, `json`, `html`)

See [CHANGELOG.md](../CHANGELOG.md) for the full history.

---

## Design principles

**Readable without a library.** Open a `.atrace` file in any text editor and understand it in 30 seconds. No binary formats, no compression, no required parsers.

**Framework-agnostic.** The spec does not reference LangChain, CrewAI, AutoGen, or any specific model API. It describes *what happened*, not how it was built.

**Additive versioning only.** Traces written against v0.1 remain valid in v0.2. New fields are always optional.

**Steps are the atom.** Each step records exactly one thing the agent did. No bundling multiple actions into one step.

**`meta` absorbs the unknown.** The root `meta` object and per-step `meta` objects accept arbitrary key-value pairs for framework-specific or custom data.

---

## The format

A trace is a JSON object. The file extension is `.atrace`. Content-type is `application/json`.

### Minimal valid trace (unchanged from v0.1)

```json
{
  "atrace": "0.2.0",
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
| `atrace` | string | yes | Spec version. Always `"0.2.0"` for this version. |
| `id` | string | yes | Unique trace ID. Convention: `trace_` prefix + random alphanumeric. |
| `agent` | object | yes | Identifies the agent that ran. See [Agent object](#agent-object). |
| `goal` | string | yes | Plain English statement of what the agent was asked to do. |
| `input` | string | no | The raw input or prompt passed to the agent. Useful when `goal` is a developer-written summary and you also want the verbatim user message. |
| `status` | enum | yes | One of: `running`, `completed`, `failed`, `cancelled`. |
| `started_at` | ISO 8601 | yes | Wall clock time the run began. |
| `ended_at` | ISO 8601 | no | Wall clock time the run ended. Omitted if `status` is `running`. |
| `steps` | array | yes | Ordered list of every action the agent took. May be empty if the run ended immediately. |
| `tokens` | object | no | Standardised token accounting for the full trace. See [Tokens object](#tokens-object). |
| `parent_trace_id` | string | no | If this agent was spawned by another agent, the ID of the parent trace. |
| `meta` | object | no | Arbitrary key-value pairs. Framework name, custom tags, cost estimates. |

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

## Tokens object

Promoted from a `meta` convention in v0.1 to a first-class root field in v0.2. Standardising this field enables cost analysers and dashboards to work across any trace without knowing the framework.

```json
"tokens": {
  "input": 420,
  "output": 1422,
  "cache_read": 3200,
  "cache_write": 800,
  "total": 5842
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `input` | integer | no | Tokens consumed from the input prompt. |
| `output` | integer | no | Tokens generated in the output. |
| `cache_read` | integer | no | Tokens read from the prompt cache (e.g. Anthropic cache hits). |
| `cache_write` | integer | no | Tokens written to the prompt cache. |
| `total` | integer | no | Total tokens. Should equal `input + output` if cache fields are omitted. |

You do not need to populate all fields. A trace that only knows `total` should set only `total`.

---

## Steps

The `steps` array is the core of the format. Each step records exactly one thing the agent did. Steps are ordered chronologically.

Every step has these base fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Unique step ID within this trace. Convention: `step_` prefix + integer or random. |
| `type` | enum | yes | The kind of action. One of: `think`, `tool_call`, `respond`, `handoff`, `error`, `memory`, `loop`, `custom`. |
| `started_at` | ISO 8601 | yes | When this step began. |
| `ended_at` | ISO 8601 | no | When this step ended. Omitted for instantaneous steps. |
| `retry_of` | string | no | The `id` of the step this is a retry of. Links retry attempts to their origin. |
| `meta` | object | no | Arbitrary step-level metadata. |

---

### Step type: `think`

Internal reasoning. The agent thought before acting. No external call was made.

```json
{
  "id": "step_1",
  "type": "think",
  "started_at": "2026-04-14T10:00:01Z",
  "reasoning": "The user wants competitors. I should search for storytelling apps targeting anxious communicators."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `reasoning` | string | yes | The agent's internal reasoning text. |

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
  "input": { "query": "storytelling app public speaking anxiety 2026" },
  "output": { "results": ["Orai", "Speeko", "Yoodli"] },
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

The agent produced a response — either a final answer or an intermediate message.

```json
{
  "id": "step_5",
  "type": "respond",
  "started_at": "2026-04-14T10:00:40Z",
  "content": "The top 3 competitors are Orai, Speeko, and Yoodli.",
  "format": "markdown",
  "final": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | string | yes | The text of the response. |
| `format` | enum | no | Content format. One of: `text`, `markdown`, `json`, `html`. Defaults to `text` if omitted. |
| `final` | boolean | no | `true` if this is the terminal response of the run. Defaults to `false`. |

---

### Step type: `handoff`

The agent delegated work to a sub-agent.

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
| `to_agent` | string | yes | Name of the agent being delegated to. |
| `task` | string | yes | Plain English description of what was delegated. |
| `child_trace_id` | string | no | The `id` of the child trace. |

---

### Step type: `error`

Something went wrong.

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
| `recoverable` | boolean | no | Whether the agent could theoretically retry. |

---

### Step type: `memory` *(new in v0.2)*

The agent read, wrote, or deleted an entry from a memory store. This covers any persistent or session-scoped key-value store, vector store, or structured memory system the agent uses.

```json
{
  "id": "step_3",
  "type": "memory",
  "started_at": "2026-04-14T10:00:05Z",
  "ended_at": "2026-04-14T10:00:06Z",
  "operation": "write",
  "store": "session_memory",
  "key": "user_preferences",
  "value": { "tone": "concise", "language": "en", "expertise": "beginner" },
  "duration_ms": 12
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `operation` | enum | yes | One of: `read`, `write`, `delete`, `search`. |
| `store` | string | no | Name or identifier of the memory store. e.g. `"session_memory"`, `"vector_db"`, `"redis_cache"`. |
| `key` | string | no | The key being read, written, or deleted. Omit for `search` operations. |
| `value` | any | no | The value written (for `write`) or retrieved (for `read`). Omit for `delete`. |
| `query` | string | no | The search query for `search` operations. |
| `results` | array | no | Results returned by a `search` operation. Each result should be a string or object. |
| `duration_ms` | number | no | Elapsed time of the memory operation in milliseconds. |
| `error` | string | no | Error message if the operation failed. |

---

### Step type: `loop` *(new in v0.2)*

The agent entered an iterative reasoning cycle — a ReAct loop, a retry loop, or any structured iteration. Each iteration is recorded as a nested array of steps.

`loop` steps are containers. The inner `iterations` array holds the actual work; each iteration is itself an array of steps using the same step types as the root `steps` array.

```json
{
  "id": "step_2",
  "type": "loop",
  "started_at": "2026-04-14T10:00:02Z",
  "ended_at": "2026-04-14T10:00:38Z",
  "label": "research_loop",
  "max_iterations": 5,
  "exit_reason": "goal_reached",
  "iterations": [
    {
      "index": 1,
      "steps": [
        { "id": "step_2_1_1", "type": "think", "started_at": "2026-04-14T10:00:02Z", "reasoning": "I need to search for pricing data." },
        { "id": "step_2_1_2", "type": "tool_call", "started_at": "2026-04-14T10:00:03Z", "ended_at": "2026-04-14T10:00:04Z", "tool": "web_search", "input": { "query": "Speeko pricing 2026" }, "output": { "price": "$9.99/mo" }, "duration_ms": 980 }
      ]
    },
    {
      "index": 2,
      "steps": [
        { "id": "step_2_2_1", "type": "think", "started_at": "2026-04-14T10:00:20Z", "reasoning": "Pricing found. I have enough data to respond." }
      ]
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `label` | string | no | Human-readable name for this loop. e.g. `"research_loop"`, `"react_cycle"`. |
| `max_iterations` | integer | no | The maximum number of iterations configured. |
| `exit_reason` | string | no | Why the loop exited. Recommended values: `goal_reached`, `max_iterations`, `error`, `cancelled`. |
| `iterations` | array | yes | Ordered array of iteration objects. Each has an `index` (integer, 1-based) and `steps` (array of steps). |

**Step IDs inside loops** must still be unique within the trace. The recommended convention is `{loop_step_id}_{iteration_index}_{step_index}`, e.g. `step_2_1_3`.

---

### Step type: `custom` *(new in v0.2)*

A framework-specific or user-defined action that does not fit any built-in step type. Using `custom` instead of `meta` on an existing type makes the action a first-class event in the trace, visible to viewers and analysers.

```json
{
  "id": "step_6",
  "type": "custom",
  "started_at": "2026-04-14T10:00:45Z",
  "ended_at": "2026-04-14T10:00:46Z",
  "custom_type": "guardrail_check",
  "data": {
    "policy": "no_pii",
    "input_text": "Here is the user message...",
    "passed": true,
    "latency_ms": 34
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `custom_type` | string | yes | The name of the custom step. Convention: `snake_case`. Should be stable across runs. |
| `data` | object | no | Arbitrary structured data for this custom step. |

Tools that do not recognise a `custom_type` should display it generically rather than failing.

---

## `retry_of` — linking retries *(new in v0.2)*

Any step may carry a `retry_of` field referencing an earlier step's `id`. This creates an explicit link between a failed attempt and its retry, enabling viewers to group them and analysers to count retry rates.

```json
[
  {
    "id": "step_3",
    "type": "tool_call",
    "started_at": "2026-04-14T09:00:02Z",
    "tool": "http_get",
    "input": { "url": "https://api.example.com/data" },
    "output": null,
    "error": "HTTP 429: Rate limit exceeded"
  },
  {
    "id": "step_5",
    "type": "tool_call",
    "started_at": "2026-04-14T09:01:10Z",
    "retry_of": "step_3",
    "tool": "http_get",
    "input": { "url": "https://api.example.com/data" },
    "output": { "count": 1842 },
    "error": null
  }
]
```

`retry_of` must reference a step `id` that exists earlier in the same trace (or in a parent loop iteration). Forward references are not valid.

---

## Meta

The `meta` field at root and on each step accepts arbitrary key-value pairs. There are no reserved keys, but the following conventions are recommended:

```json
"meta": {
  "framework": "langchain",
  "framework_version": "0.3.1",
  "environment": "production",
  "tags": ["competitor-research", "weekly-report"]
}
```

Token counts previously stored in `meta` should be migrated to the root `tokens` field. The `meta` convention is retained for backwards compatibility.

---

## Multi-agent traces

When an orchestrator delegates to sub-agents, each agent produces its own trace. Traces are linked via `parent_trace_id` and `handoff.child_trace_id`.

```
trace_root (orchestrator)
  └── step: handoff → child_trace_id: trace_child_1
  └── step: handoff → child_trace_id: trace_child_2

trace_child_1 (parent_trace_id: trace_root)
trace_child_2 (parent_trace_id: trace_root)
```

Each trace is independently valid. You do not need the parent to understand a child.

---

## Versioning

This is `atrace` version `0.2.0`.

- **Patch** (0.2.x): Bug fixes to the spec text only. No schema changes.
- **Minor** (0.x.0): New optional fields added. All existing traces remain valid.
- **Major** (x.0.0): Breaking changes. Fields renamed or removed. Requires a migration.

All validators must accept traces from any minor/patch version within the same major version.

---

## FAQ

**Why is `tokens` a root field now instead of `meta`?**
Token counting is nearly universal — every LLM agent has it. Keeping it in `meta` meant every tool had to hard-code `meta.total_tokens` as a convention. Promoting it to a typed root field lets analysers and dashboards work without framework-specific knowledge.

**When should I use `loop` vs just listing steps sequentially?**
Use `loop` when the agent has an explicit iteration budget or exit condition, and when you want viewers to be able to collapse or navigate by iteration. If the agent is just doing a sequence of actions that happen to repeat, sequential steps are fine.

**When should I use `custom` vs `meta` on an existing step?**
If the action is a first-class event you want visible in traces (e.g. a guardrail check, a cache lookup, a human approval step), use `custom`. If it is auxiliary metadata about an existing step (e.g. the cost of a tool call), use `meta` on that step.

**Can I still put token counts in `meta`?**
Yes. Validators will not fail if you have both `tokens` at root and token fields in `meta`. The canonical location is now `tokens`, but the `meta` convention is not removed.

**Is this affiliated with any company?**
No. AgentTrace is an independent open standard. Not affiliated with Anthropic, OpenAI, or any framework vendor.

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md). Priority contributions for v0.2:
- Integration guides for LangChain, CrewAI, AutoGen, and LlamaIndex showing how to emit `memory` and `loop` steps
- Validator implementations in Python and TypeScript (see the `validators/` directory)
- Real example traces using the new step types

---

## License

The AgentTrace specification is released under [MIT License](../../LICENSE).
