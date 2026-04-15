# AgentTrace × CrewAI

Step and task callback observer for [CrewAI](https://crewai.com) crews. Records each agent's reasoning, tool calls, task completions, and the final crew output as a `.atrace` file.

## Install

```bash
pip install agentrace crewai
```

Place `agentrace_crewai.py` in your project (no separate package needed).

## Usage

```python
from agentrace_crewai import AgentTraceObserver
from crewai import Crew, Task, Agent

observer = AgentTraceObserver(
    goal="Produce a competitive analysis report",
    model="gpt-4o",
    input="Analyze the top 3 LLM API providers",
)

# Optional: record explicit handoffs before kickoff
observer.record_handoff("researcher", "Gather competitive intelligence")
observer.record_handoff("writer", "Draft the executive summary")

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, write_task],
    step_callback=observer.on_step,    # fires after each agent step
    task_callback=observer.on_task,    # fires after each task completes
)

result = crew.kickoff()
observer.record_final_output(str(result))   # record the final crew output

trace = observer.get_trace(tokens={"input": 2100, "output": 520})
trace.save("run.atrace")
```

## What gets recorded

| CrewAI event | AgentTrace step |
|---|---|
| `step_callback` with `AgentAction` | `think` (reasoning) + `tool_call` (pending) |
| `step_callback` with tool result | fills `tool_call.output` + `duration_ms` |
| `step_callback` with `AgentFinish` | fills `tool_call.output` if pending |
| `task_callback` | `custom` step with `event: "task_complete"` |
| `record_handoff(agent, task)` | `handoff` step |
| `record_final_output(output)` | `respond` step with `final: true` |

## Multi-agent orchestration

For hierarchical crews where one crew orchestrates another, link child traces via the `child_trace_id` parameter:

```python
# Child crew has its own observer
child_observer = AgentTraceObserver(goal="Sub-task: gather data")
child_trace_id = child_observer.trace_id

# Parent records the handoff with the child trace ID
parent_observer.record_handoff(
    "data-crew",
    "Gather market data",
    child_trace_id=child_trace_id,
)
```

## API

### `AgentTraceObserver(*, agent?, goal, model?, input?, agent_version?, trace_id?, meta?)`

Create an observer for one crew run. `agent` defaults to `"crew-orchestrator"`.

### `observer.on_step(step_output)`

Pass as `Crew(step_callback=observer.on_step, ...)`. Handles `AgentAction`, tool results, and `AgentFinish`.

### `observer.on_task(task_output)`

Pass as `Crew(task_callback=observer.on_task, ...)`. Records a `custom` step for each completed task.

### `observer.record_final_output(output)`

Call after `crew.kickoff()` to record the final crew response as a `respond` step.

### `observer.record_handoff(to_agent, task, *, child_trace_id?)`

Manually record that the orchestrator is delegating to a sub-agent. Call before `kickoff()` or between tasks.

### `observer.record_error(message, *, code?, recoverable?)`

Manually record an error step.

### `observer.get_trace(*, tokens?) → AgentTrace`

Returns the completed `AgentTrace`. Call after `kickoff()`.

### `observer.fail() → AgentTrace`

Returns a trace with `status: "failed"`.

### `observer.trace_id → str`

The trace ID, useful for linking child traces.

## Token usage

CrewAI doesn't expose token counts natively. Pass them manually from your LLM provider if available, or omit:

```python
trace = observer.get_trace()          # no token data
trace = observer.get_trace(tokens={"input": 2100, "output": 520})
```

## Example

See [`example.py`](example.py) for a complete runnable demo and [`example.atrace`](example.atrace) for sample output.
