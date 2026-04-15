"""
agentrace_crewai.py — AgentTrace observer for CrewAI.

Drop this file into your project. Requires: pip install agentrace crewai

Records:
  - Each task as a handoff step (orchestrator → executing agent)
  - Agent actions within each task as think + tool_call steps
  - Final crew output as a respond step

Usage:
    from agentrace_crewai import AgentTraceObserver
    from crewai import Crew, Task, Agent

    observer = AgentTraceObserver(goal="Produce a competitive analysis report")

    crew = Crew(
        agents=[researcher, writer],
        tasks=[research_task, write_task],
        step_callback=observer.on_step,
        task_callback=observer.on_task,
    )
    result = crew.kickoff()

    trace = observer.get_trace()
    trace.save("run.atrace")
"""
from __future__ import annotations

import time
from typing import Any, Callable, Dict, List, Optional, Union

from agentrace import Emitter, AgentTrace, ToolCallStep, HandoffStep

try:
    from crewai.agents.output_parser import AgentAction, AgentFinish
except ImportError:
    try:
        from langchain_core.agents import AgentAction, AgentFinish
    except ImportError:
        # Fallback stubs for type hints only — the actual objects come from crewai/langchain at runtime
        AgentAction = Any  # type: ignore
        AgentFinish = Any  # type: ignore


class AgentTraceObserver:
    """CrewAI observer that emits a complete AgentTrace.

    Pass observer.on_step and observer.on_task to the Crew constructor.
    """

    def __init__(
        self,
        *,
        agent: str = "crew-orchestrator",
        goal: str,
        model: Optional[str] = None,
        input: Optional[str] = None,
        agent_version: Optional[str] = None,
        trace_id: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None,
    ) -> None:
        self._emitter = Emitter(
            agent=agent,
            goal=goal,
            model=model,
            input=input,
            agent_version=agent_version,
            trace_id=trace_id,
            meta=meta,
        )
        self._pending_tool: Optional[ToolCallStep] = None
        self._pending_t0: Optional[float] = None
        self._current_task_idx: int = 0
        self._tasks_completed: int = 0
        self._finished = False

    # ── Step callback ────────────────────────────────────────────────────────

    def on_step(self, step_output: Any) -> None:
        """Called by CrewAI after each agent step (tool use or reasoning).

        Pass as: Crew(step_callback=observer.on_step, ...)
        """
        # step_output is AgentAction (tool use) or AgentFinish (task complete)
        # CrewAI uses LangChain's agent types internally
        if hasattr(step_output, "tool") and hasattr(step_output, "tool_input"):
            # AgentAction — agent decided to use a tool
            log = (getattr(step_output, "log", "") or "").strip()
            if log:
                reasoning = log
                for marker in ("\nAction:", "\nThought:", "Action Input:"):
                    if marker in reasoning:
                        reasoning = reasoning.split(marker)[0].strip()
                if reasoning:
                    self._emitter.think(reasoning)

            tool_input = (
                step_output.tool_input
                if isinstance(step_output.tool_input, dict)
                else {"input": str(step_output.tool_input)}
            )
            self._pending_tool = self._emitter.tool_call(step_output.tool, tool_input)
            self._pending_t0 = time.perf_counter()

        elif hasattr(step_output, "return_values"):
            # AgentFinish — agent completed its current task step
            if self._pending_tool is not None:
                output = step_output.return_values.get("output", "")
                self._pending_tool.output = str(output)
                if self._pending_t0 is not None:
                    self._pending_tool.duration_ms = round(
                        (time.perf_counter() - self._pending_t0) * 1000, 1
                    )
                self._pending_tool = None
                self._pending_t0 = None

        elif hasattr(step_output, "result"):
            # Tool result — update the pending tool_call
            if self._pending_tool is not None:
                self._pending_tool.output = str(step_output.result)
                if self._pending_t0 is not None:
                    self._pending_tool.duration_ms = round(
                        (time.perf_counter() - self._pending_t0) * 1000, 1
                    )
                self._pending_tool = None
                self._pending_t0 = None

    # ── Task callback ────────────────────────────────────────────────────────

    def on_task(self, task_output: Any) -> None:
        """Called by CrewAI after each task completes.

        Pass as: Crew(task_callback=observer.on_task, ...)
        """
        self._tasks_completed += 1
        output = (
            task_output.raw
            if hasattr(task_output, "raw")
            else str(task_output)
        )
        agent_name = (
            task_output.agent
            if hasattr(task_output, "agent")
            else f"agent-{self._tasks_completed}"
        )
        # Record task completion as a handoff result
        self._emitter.custom(
            "task_complete",
            data={
                "task_index": self._tasks_completed,
                "agent": agent_name,
                "output_preview": output[:200] if len(output) > 200 else output,
            },
        )

    # ── Convenience: record the final crew output ─────────────────────────────

    def record_final_output(self, output: str) -> None:
        """Optionally call after crew.kickoff() to record the final crew response."""
        self._emitter.respond(output, final=True)
        self._finished = True

    def record_handoff(
        self,
        to_agent: str,
        task: str,
        *,
        child_trace_id: Optional[str] = None,
    ) -> None:
        """Record that the orchestrator is delegating a task to a sub-agent.

        Call this before kickoff() if you want explicit handoff tracking.
        """
        self._emitter.handoff(to_agent, task, child_trace_id=child_trace_id)

    def record_error(
        self,
        message: str,
        *,
        code: Optional[str] = None,
        recoverable: bool = False,
    ) -> None:
        self._emitter.error(message, code=code, recoverable=recoverable)

    # ── Result ───────────────────────────────────────────────────────────────

    def get_trace(
        self,
        *,
        tokens: Optional[Dict[str, int]] = None,
    ) -> AgentTrace:
        """Return the completed AgentTrace. Call after crew.kickoff()."""
        status = "completed" if self._tasks_completed > 0 else "failed"
        return self._emitter.finish(status, tokens=tokens)

    def fail(self) -> AgentTrace:
        return self._emitter.fail()

    @property
    def trace_id(self) -> str:
        return self._emitter._trace_id
