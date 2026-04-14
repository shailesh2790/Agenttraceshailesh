# AgentTrace

An open, framework-agnostic standard for recording what AI agents do and why.

```json
{
  "atrace": "0.1.0",
  "id": "trace_abc123",
  "agent": { "name": "research-agent", "model": "claude-sonnet-4-20250514" },
  "goal": "Find the top 3 competitors for StorySpark",
  "status": "completed",
  "steps": [
    { "id": "step_1", "type": "think", "reasoning": "I should search for storytelling apps..." },
    { "id": "step_2", "type": "tool_call", "tool": "web_search", "input": { "query": "storytelling app coach 2026" }, "output": { "results": ["Orai", "Speeko", "Yoodli"] } },
    { "id": "step_3", "type": "respond", "content": "The top 3 competitors are Orai, Speeko, and Yoodli.", "final": true }
  ]
}
```

---

## The problem

When an agent fails or behaves unexpectedly, developers have almost no visibility into what happened. Existing observability tools log LLM API calls — but they don't understand agent semantics: goals, sub-tasks, decisions, retries, handoffs between agents.

AgentTrace gives agents a structured trace of their own reasoning. One JSON file. Any framework can emit it. Any tool can read it.

---

## What you can build on top of this format

- A **timeline viewer** that shows every decision the agent made, in order
- A **diff tool** that compares two runs of the same agent — what changed?
- A **replay runner** that re-executes a trace with a different model version
- A **behavioural test harness** — did the agent call the right tool before responding?
- A **cost analyser** — which step consumed the most tokens?

None of these tools need to know anything about the agent framework. They just read `.atrace` files.

---

## Spec

→ [spec/v0.2/README.md](spec/v0.2/README.md) — full specification (current)

→ [spec/v0.2/schema.json](spec/v0.2/schema.json) — JSON Schema for validation

→ [spec/v0.2/examples/](spec/v0.2/examples/) — example traces

→ [spec/v0.1/README.md](spec/v0.1/README.md) — v0.1 spec (stable, supported)

→ [spec/CHANGELOG.md](spec/CHANGELOG.md) — full version history

---

## Examples

### v0.2

| File | What it shows |
|---|---|
| [memory-agent.atrace](spec/v0.2/examples/memory-agent.atrace) | Agent reading user profile and history from memory stores, writing back after each session |
| [react-loop.atrace](spec/v0.2/examples/react-loop.atrace) | ReAct-style research loop with nested iterations, including an intra-loop retry |
| [retry-with-backoff.atrace](spec/v0.2/examples/retry-with-backoff.atrace) | Exponential backoff retries linked via `retry_of`, plus a `custom` guardrail check step |
| [custom-steps.atrace](spec/v0.2/examples/custom-steps.atrace) | Content moderation pipeline using `custom` steps for PII scrubbing, safety checks, and structured decisions |

### v0.1

| File | What it shows |
|---|---|
| [minimal.atrace](spec/v0.1/examples/minimal.atrace) | Simplest valid trace — one respond step |
| [tool-use.atrace](spec/v0.1/examples/tool-use.atrace) | Agent using web search and fetch tools |
| [multi-agent.atrace](spec/v0.1/examples/multi-agent.atrace) | Orchestrator delegating to sub-agents via handoff steps |
| [failed-run.atrace](spec/v0.1/examples/failed-run.atrace) | Agent hitting a rate limit, retrying, and failing gracefully |

---

## Validators

> Coming in week 2: `pip install agentrace` and `npm install agentrace`

Validate any `.atrace` file against the spec. Both packages will expose:
- `validate(trace)` — returns errors or `null`
- `emit()` — context manager / wrapper to instrument your agent

---

## Integrations

> Coming in week 3

- LangChain — one callback handler, zero changes to your agent code
- CrewAI — coming soon
- AutoGen — coming soon

---

## Contributing

The highest-value contributions right now:

- **Integration guides** for LangChain, CrewAI, and AutoGen
- **Feedback on the spec** — open an issue with your use case
- **Example traces** from real agents you've built
- **Validator implementations** in other languages (Go, Rust, Ruby)

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## Status

`v0.1.0` — spec complete, validators in progress. The format is stable enough to start building on.

This is an independent open standard. Not affiliated with Anthropic, OpenAI, or any framework vendor.

---

## License

MIT — see [LICENSE](LICENSE)
