# AgentTrace × LangChain

`BaseCallbackHandler` integration for any LangChain `AgentExecutor` or LCEL chain. Records agent reasoning, tool calls, and final answers as a `.atrace` file.

## Install

```bash
pip install agentrace langchain-core
```

Place `agentrace_langchain.py` in your project (no separate package needed).

## Usage

```python
from agentrace_langchain import AgentTraceCallback
from langchain.agents import AgentExecutor, create_react_agent
from langchain_openai import ChatOpenAI

handler = AgentTraceCallback(
    agent="research-agent",
    goal="Find the top 3 competitors",
    model="gpt-4o",
    input="Who are the top 3 competitors in the LLM API space?",
)

llm = ChatOpenAI(model="gpt-4o")
agent = create_react_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, callbacks=[handler])

result = executor.invoke({"input": "Who are the top 3 competitors in the LLM API space?"})

trace = handler.get_trace(tokens={"input": 1200, "output": 320})
trace.save("run.atrace")
```

## What gets recorded

| LangChain callback | AgentTrace step |
|---|---|
| `on_agent_action` | `think` (reasoning before action) + `tool_call` (pending) |
| `on_tool_end` | fills `tool_call.output` + `duration_ms` |
| `on_tool_error` | fills `tool_call.error` + `duration_ms` |
| `on_agent_finish` | `respond` with `final: true` |
| `on_llm_error` | `error` with `code: "LLM_ERROR"` |
| `on_chain_error` | `error` with `code: "CHAIN_ERROR"` |

### Reasoning extraction

LangChain's ReAct agents include chain-of-thought in `action.log` before the `Action:` marker. The handler automatically strips the action decision and records only the reasoning as a `think` step:

```
Thought: I need to search for current data.    ← becomes think step
Action: search                                  ← stripped
Action Input: top LLM APIs 2024               ← stripped
```

## Multi-agent traces

For hierarchical agents, pass a `parent_trace_id` to link child traces:

```python
# Orchestrator creates the parent trace
parent_handler = AgentTraceCallback(agent="orchestrator", goal="...")
parent_trace_id = parent_handler.trace_id

# Each sub-agent references the parent
child_handler = AgentTraceCallback(
    agent="researcher",
    goal="Find competitors",
    parent_trace_id=parent_trace_id,
)
child_executor = AgentExecutor(agent=child_agent, tools=tools, callbacks=[child_handler])
```

## API

### `AgentTraceCallback(*, agent, goal, model?, input?, agent_version?, parent_trace_id?, trace_id?, meta?)`

Create a callback handler for one agent run.

### `handler.get_trace(*, tokens?) → AgentTrace`

Returns the completed `AgentTrace`. Call after the executor finishes.

### `handler.fail() → AgentTrace`

Returns a trace with `status: "failed"`.

### `handler.trace_id → str`

The trace ID, useful for linking child traces.

## LCEL chains

The handler also works with LCEL chains via the `callbacks` parameter:

```python
from langchain_core.runnables import RunnableConfig

chain = prompt | llm | output_parser

result = chain.invoke(
    {"input": "..."},
    config=RunnableConfig(callbacks=[handler]),
)
```

Note: LCEL chains don't fire `on_agent_action` / `on_agent_finish` — you'll need to record the final respond step manually:

```python
handler._emitter.respond(str(result), final=True)
trace = handler.get_trace()
```

## Example

See [`example.py`](example.py) for a complete runnable demo and [`example.atrace`](example.atrace) for sample output.
