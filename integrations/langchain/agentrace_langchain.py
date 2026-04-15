"""
agentrace_langchain.py — AgentTrace callback handler for LangChain.

Drop this file into your project. Requires: pip install agentrace langchain-core

Works with any LangChain AgentExecutor or LCEL chain.
Records: agent reasoning (think), tool calls (tool_call), final answer (respond).

Usage:
    from agentrace_langchain import AgentTraceCallback

    handler = AgentTraceCallback(agent="research-agent", goal="Find top competitors")

    # Pass the callback to any AgentExecutor or LCEL chain
    agent_executor = AgentExecutor(agent=agent, tools=tools, callbacks=[handler])
    result = agent_executor.invoke({"input": "What are the top 3 competitors?"})

    trace = handler.get_trace()
    trace.save("run.atrace")
"""
from __future__ import annotations

import time
from typing import Any, Dict, List, Optional, Union
from uuid import UUID

from agentrace import Emitter, AgentTrace, ToolCallStep

try:
    from langchain_core.callbacks.base import BaseCallbackHandler
    from langchain_core.agents import AgentAction, AgentFinish
    from langchain_core.outputs import LLMResult
except ImportError as e:
    raise ImportError(
        "langchain-core is required: pip install langchain-core"
    ) from e


class AgentTraceCallback(BaseCallbackHandler):
    """LangChain callback handler that emits a complete AgentTrace.

    Attach to any AgentExecutor or LCEL chain via the callbacks= parameter.
    Captures agent reasoning (think steps), tool calls, and final answers.
    """

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
        super().__init__()
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
        self._pending_tool: Optional[ToolCallStep] = None
        self._pending_t0: Optional[float] = None
        self._finished = False

    # ── Agent callbacks ─────────────────────────────────────────────────────

    def on_agent_action(
        self,
        action: AgentAction,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        """Agent has decided to use a tool. Record reasoning + start tool_call."""
        # The agent's log contains the chain-of-thought reasoning
        log = (action.log or "").strip()
        if log:
            # Strip common LangChain prefixes like "Action: ...\nAction Input: ..."
            # The reasoning is the text before the action decision
            reasoning = log
            for marker in ("\nAction:", "\nThought:", "Action Input:"):
                if marker in reasoning:
                    reasoning = reasoning.split(marker)[0].strip()
            if reasoning:
                self._emitter.think(reasoning)

        # Start a pending tool_call step; output filled in on_tool_end
        tool_input = (
            action.tool_input
            if isinstance(action.tool_input, dict)
            else {"input": str(action.tool_input)}
        )
        self._pending_tool = self._emitter.tool_call(action.tool, tool_input)
        self._pending_t0 = time.perf_counter()

    def on_tool_end(
        self,
        output: str,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        """Tool finished. Update the pending tool_call step with output + duration."""
        if self._pending_tool is not None:
            self._pending_tool.output = str(output)
            if self._pending_t0 is not None:
                self._pending_tool.duration_ms = round(
                    (time.perf_counter() - self._pending_t0) * 1000, 1
                )
        self._pending_tool = None
        self._pending_t0 = None

    def on_tool_error(
        self,
        error: Union[Exception, KeyboardInterrupt],
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        """Tool raised an error."""
        if self._pending_tool is not None:
            self._pending_tool.error = str(error)
            if self._pending_t0 is not None:
                self._pending_tool.duration_ms = round(
                    (time.perf_counter() - self._pending_t0) * 1000, 1
                )
        self._pending_tool = None
        self._pending_t0 = None

    def on_agent_finish(
        self,
        finish: AgentFinish,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        """Agent produced its final answer."""
        output = finish.return_values.get("output", "")
        if output:
            self._emitter.respond(str(output), final=True)
        self._finished = True

    # ── Error callbacks ──────────────────────────────────────────────────────

    def on_llm_error(
        self,
        error: Union[Exception, KeyboardInterrupt],
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        self._emitter.error(str(error), code="LLM_ERROR", recoverable=False)

    def on_chain_error(
        self,
        error: Union[Exception, KeyboardInterrupt],
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        self._emitter.error(str(error), code="CHAIN_ERROR", recoverable=False)

    # ── Result ───────────────────────────────────────────────────────────────

    def get_trace(
        self,
        *,
        tokens: Optional[Dict[str, int]] = None,
    ) -> AgentTrace:
        """Return the AgentTrace. Call after the agent run completes."""
        status = "completed" if self._finished else "failed"
        return self._emitter.finish(status, tokens=tokens)

    def fail(self) -> AgentTrace:
        return self._emitter.fail()

    @property
    def trace_id(self) -> str:
        return self._emitter._trace_id
