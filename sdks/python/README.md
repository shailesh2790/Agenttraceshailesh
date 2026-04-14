# agentrace (Python)

Python SDK for the [AgentTrace](https://github.com/shailesh2790/Agenttraceshailesh) open standard — validate and emit `.atrace` files that record what your AI agents do and why.

```bash
pip install agentrace
```

---

## Quickstart

```python
from agentrace import Emitter

emitter = Emitter(
    agent="research-agent",
    goal="Find top competitors for a storytelling app",
    model="claude-sonnet-4-6",
    input="What are the top 3 competitors for StorySpark?",
)

emitter.think("I should search for storytelling and public speaking apps")

emitter.tool_call(
    "web_search",
    input={"query": "storytelling app public speaking coach 2026"},
    output={"results": ["Orai", "Speeko", "Yoodli"]},
    duration_ms=1240,
)

emitter.respond(
    "The top 3 competitors are Orai, Speeko, and Yoodli.",
    format="markdown",
    final=True,
)

trace = emitter.finish()
trace.save("run.atrace")
```

---

## API

### `Emitter`

```python
Emitter(
    agent="agent-name",          # required — agent.name
    goal="Plain English goal",   # required
    model="claude-sonnet-4-6",   # optional — agent.model
    agent_version="1.0.0",       # optional — agent.version
    input="raw user prompt",     # optional — verbatim input
    parent_trace_id="trace_xyz", # optional — for sub-agents
    trace_id="trace_custom_id",  # optional — auto-generated if omitted
    meta={"env": "production"},  # optional — root-level meta
)
```

#### Step methods

| Method | Step type | Key fields |
|---|---|---|
| `emitter.think(reasoning)` | `think` | `reasoning` |
| `emitter.tool_call(tool, input, *, output, duration_ms, error, retry_of)` | `tool_call` | `tool`, `input` |
| `emitter.respond(content, *, format, final)` | `respond` | `content` |
| `emitter.handoff(to_agent, task, *, child_trace_id)` | `handoff` | `to_agent`, `task` |
| `emitter.error(message, *, code, recoverable)` | `error` | `message` |
| `emitter.memory(operation, *, store, key, value, query, results)` | `memory` | `operation` |
| `emitter.loop(iterations, *, label, max_iterations, exit_reason)` | `loop` | `iterations` |
| `emitter.custom(custom_type, *, data)` | `custom` | `custom_type` |

All step methods accept `meta={}` and `step_id="step_custom"` keyword arguments.

#### Auto-timed tool calls

```python
with emitter.time_tool_call("web_fetch", {"url": "https://example.com"}) as call:
    result = fetch("https://example.com")
    call.output = result
# duration_ms and ended_at are recorded automatically
```

#### Finishing a trace

```python
trace = emitter.finish()                        # status="completed"
trace = emitter.finish(status="cancelled")
trace = emitter.fail()                          # status="failed"
trace = emitter.finish(tokens={"input": 420, "output": 1422, "total": 1842})
```

#### Saving

```python
trace.save("run.atrace")         # write to file
json_str = trace.to_json()       # get JSON string
data = trace.to_dict()           # get plain dict
```

---

### `validate(trace: dict) -> list | None`

```python
from agentrace import validate
import json

with open("run.atrace") as f:
    data = json.load(f)

errors = validate(data)
if errors is None:
    print("valid")
else:
    for e in errors:
        print(e["path"], e["message"])
```

Returns `None` if valid, or a list of `{"path": str, "message": str}` dicts if invalid.

---

## Retry tracking

```python
first = emitter.tool_call("api_get", {"url": "..."}, error="HTTP 503")
# ... wait, then retry ...
emitter.tool_call("api_get", {"url": "..."}, output={...}, retry_of=first.id)
```

---

## Memory steps

```python
emitter.memory("read", store="user_profiles", key="user_123", value={"name": "Priya"})
emitter.memory("search", store="vector_db", query="anxiety tips", results=[...])
emitter.memory("write", store="session", key="last_topic", value="pacing")
```

---

## Requirements

- Python 3.9+
- `pydantic>=2.0`
- `jsonschema>=4.0`
