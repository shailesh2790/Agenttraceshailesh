"""
agentrace_anthropic.py — AgentTrace integration for the Anthropic Python SDK.

Drop this file into your project. Requires: pip install agentrace anthropic

Records:
  - thinking blocks   → think steps
  - tool_use blocks   → tool_call steps (output filled in via record_tool_result)
  - text blocks       → respond steps (final=True on stop_reason "end_turn")

Usage:
    from agentrace_anthropic import AnthropicTracer
    import anthropic

    client = anthropic.Anthropic()
    tracer = AnthropicTracer(agent="research-agent", goal="Find top competitors")

    messages = [{"role": "user", "content": "What are the top 3 competitors?"}]
    while True:
        response = client.messages.create(
            model="claude-sonnet-4-5", messages=messages, tools=tools
        )
        tracer.record_response(response)

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = execute_tool(block.name, block.input)
                    tracer.record_tool_result(block.id, result)
                    tool_results.append({
                        "type": "tool_result", "tool_use_id": block.id,
                        "content": str(result),
                    })
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
        else:
            break

    trace = tracer.finish()
    trace.save("run.atrace")
"""
from __future__ import annotations

import time
from typing import Any, Dict, Optional

from agentrace import Emitter, AgentTrace, ToolCallStep


class AnthropicTracer:
    """Minimal wrapper for the Anthropic Python SDK that emits AgentTrace steps."""

    def __init__(
        self,
        *,
        agent: str,
        goal: str,
        model: Optional[str] = None,
        input: Optional[str] = None,
        agent_version: Optional[str] = None,
        parent_trace_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None,
    ) -> None:
        self._emitter = Emitter(
            agent=agent,
            goal=goal,
            model=model,
            input=input,
            agent_version=agent_version,
            parent_trace_id=parent_trace_id,
            trace_id=trace_id,
            meta=meta,
        )
        # tool_use_id → (ToolCallStep, perf_counter start)
        self._pending: Dict[str, tuple[ToolCallStep, float]] = {}

    def record_response(self, response: Any) -> None:
        """Record all content blocks from an Anthropic messages.create() response.

        Call this immediately after every messages.create() call.
        """
        for block in response.content:
            t = getattr(block, "type", None)
            if t == "thinking":
                self._emitter.think(block.thinking)
            elif t == "tool_use":
                step = self._emitter.tool_call(
                    block.name,
                    dict(block.input) if hasattr(block.input, "items") else {"input": block.input},
                )
                self._pending[block.id] = (step, time.perf_counter())
            elif t == "text":
                text = block.text.strip()
                if text:
                    is_final = getattr(response, "stop_reason", None) == "end_turn"
                    self._emitter.respond(text, final=is_final)

    def record_tool_result(
        self,
        tool_use_id: str,
        result: Any,
        *,
        error: Optional[str] = None,
    ) -> None:
        """Update the pending tool_call step with its output and duration.

        Call this after executing the tool for each tool_use block.
        """
        entry = self._pending.pop(tool_use_id, None)
        if entry is None:
            return
        step, t0 = entry
        step.output = result
        step.duration_ms = round((time.perf_counter() - t0) * 1000, 1)
        if error:
            step.error = error

    def record_error(
        self,
        message: str,
        *,
        code: Optional[str] = None,
        recoverable: bool = False,
    ) -> None:
        """Manually record an error step (e.g. API errors, tool execution failures)."""
        self._emitter.error(message, code=code, recoverable=recoverable)

    def finish(
        self,
        status: str = "completed",
        *,
        tokens: Optional[Dict[str, int]] = None,
    ) -> AgentTrace:
        """Return the completed AgentTrace. Alias: tracer.fail() for status='failed'."""
        return self._emitter.finish(status, tokens=tokens)

    def fail(self, *, tokens: Optional[Dict[str, int]] = None) -> AgentTrace:
        return self._emitter.fail(tokens=tokens)

    @property
    def trace_id(self) -> str:
        return self._emitter._trace_id
