# AgentTrace × Anthropic SDK

Thin wrapper around the [Anthropic Python SDK](https://github.com/anthropics/anthropic-sdk-python) that produces a complete `.atrace` file from any agentic loop.

## Install

```bash
pip install agentrace anthropic
```

Place `agentrace_anthropic.py` in your project (no separate package needed).

## Usage

```python
from agentrace_anthropic import AnthropicTracer
import anthropic

client = anthropic.Anthropic()

tracer = AnthropicTracer(
    agent="research-agent",
    goal="Find top competitors",
    model="claude-sonnet-4-6",
    input="Who are the top 3 competitors?",
)

messages = [{"role": "user", "content": "Who are the top 3 competitors?"}]

while True:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        tools=tools,
        messages=messages,
    )
    tracer.record_response(response)          # records think/tool_call/respond steps

    if response.stop_reason == "tool_use":
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = execute_tool(block.name, block.input)
                tracer.record_tool_result(block.id, result)   # fills output + duration_ms
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": str(result),
                })
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})
    else:
        break

trace = tracer.finish("completed", tokens={"input": 1200, "output": 350})
trace.save("run.atrace")
```

## What gets recorded

| Content block type | AgentTrace step |
|---|---|
| `thinking` | `think` |
| `tool_use` | `tool_call` (output + duration filled on `record_tool_result`) |
| `text` (final) | `respond` with `final: true` |
| `text` (intermediate) | `respond` with `final: false` |

## API

### `AnthropicTracer(*, agent, goal, model?, input?, agent_version?, parent_trace_id?, trace_id?, meta?)`

Create a tracer for one agent run.

### `tracer.record_response(response)`

Call immediately after every `client.messages.create()`. Records all content blocks.

### `tracer.record_tool_result(tool_use_id, result, *, error?)`

Call after executing each tool. Fills the pending `tool_call` step with output and elapsed duration.

### `tracer.record_error(message, *, code?, recoverable?)`

Manually record an error step (e.g. API errors, tool failures outside normal flow).

### `tracer.finish(status="completed", *, tokens?) → AgentTrace`

Returns the completed `AgentTrace`. Call once after the loop exits.

### `tracer.fail(*, tokens?) → AgentTrace`

Convenience alias for `finish("failed")`.

### `tracer.trace_id → str`

The trace ID, useful for linking child traces in multi-agent setups.

## Extended thinking

`thinking` content blocks are automatically captured as `think` steps — no extra configuration needed. Just enable extended thinking in your `messages.create()` call:

```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=16000,
    thinking={"type": "enabled", "budget_tokens": 10000},
    messages=messages,
)
tracer.record_response(response)   # thinking blocks → think steps
```

## Token tracking

Pass the usage from the final response for accurate token counts:

```python
trace = tracer.finish(
    "completed",
    tokens={
        "input":  response.usage.input_tokens,
        "output": response.usage.output_tokens,
    },
)
```

## Example

See [`example.py`](example.py) for a complete runnable demo and [`example.atrace`](example.atrace) for sample output.
