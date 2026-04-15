# AgentTrace Integrations

Drop-in observers and callback handlers that connect AgentTrace to popular AI agent frameworks. Each integration is a single `.py` file — no extra package to install beyond `agentrace` and the target framework.

## Available integrations

| Framework | File | What it instruments |
|---|---|---|
| [Anthropic SDK](anthropic/) | `agentrace_anthropic.py` | `thinking` blocks → `think`, `tool_use` → `tool_call`, `text` → `respond` |
| [LangChain](langchain/) | `agentrace_langchain.py` | `AgentExecutor` via `BaseCallbackHandler` |
| [CrewAI](crewai/) | `agentrace_crewai.py` | `step_callback` + `task_callback` |

## Quick start

### Anthropic SDK

```python
from agentrace_anthropic import AnthropicTracer
import anthropic

client = anthropic.Anthropic()
tracer = AnthropicTracer(agent="my-agent", goal="...")

while True:
    response = client.messages.create(model="claude-sonnet-4-6", ...)
    tracer.record_response(response)
    if response.stop_reason != "tool_use":
        break
    # ... execute tools, call tracer.record_tool_result(id, result) ...

trace = tracer.finish()
trace.save("run.atrace")
```

### LangChain

```python
from agentrace_langchain import AgentTraceCallback
from langchain.agents import AgentExecutor

handler = AgentTraceCallback(agent="my-agent", goal="...")
executor = AgentExecutor(agent=agent, tools=tools, callbacks=[handler])
executor.invoke({"input": "..."})

trace = handler.get_trace()
trace.save("run.atrace")
```

### CrewAI

```python
from agentrace_crewai import AgentTraceObserver
from crewai import Crew

observer = AgentTraceObserver(goal="...")
crew = Crew(
    agents=[...], tasks=[...],
    step_callback=observer.on_step,
    task_callback=observer.on_task,
)
result = crew.kickoff()
observer.record_final_output(str(result))

trace = observer.get_trace()
trace.save("run.atrace")
```

## Viewing traces

```bash
# CLI
agentrace view run.atrace
agentrace stats run.atrace

# Web viewer — drag and drop run.atrace at:
# https://shailesh2790.github.io/Agenttraceshailesh
```

## Common patterns

### Linking parent ↔ child traces

```python
# Orchestrator
parent_tracer = AnthropicTracer(agent="orchestrator", goal="...")
parent_trace_id = parent_tracer.trace_id

# Sub-agent references the parent
child_handler = AgentTraceCallback(
    agent="researcher",
    goal="...",
    parent_trace_id=parent_trace_id,
)
```

### Error recording

All integrations expose `record_error(message, *, code?, recoverable?)`:

```python
try:
    result = crew.kickoff()
except Exception as e:
    observer.record_error(str(e), code="CREW_ERROR", recoverable=False)
    trace = observer.fail()
    trace.save("run.atrace")
```

### Token tracking

```python
trace = tracer.finish(tokens={"input": 1200, "output": 350})
```

## Structure

```
integrations/
├── README.md                       ← this file
├── anthropic/
│   ├── agentrace_anthropic.py      ← AnthropicTracer
│   ├── example.py
│   ├── example.atrace
│   └── README.md
├── langchain/
│   ├── agentrace_langchain.py      ← AgentTraceCallback
│   ├── example.py
│   ├── example.atrace
│   └── README.md
└── crewai/
    ├── agentrace_crewai.py         ← AgentTraceObserver
    ├── example.py
    ├── example.atrace
    └── README.md
```
