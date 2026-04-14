from __future__ import annotations

import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, Generator, List, Optional

from ._models import (
    AgentInfo,
    AgentTrace,
    AnyStep,
    CustomStep,
    ErrorStep,
    HandoffStep,
    LoopIteration,
    LoopStep,
    MemoryStep,
    RespondStep,
    ThinkStep,
    TokenCounts,
    ToolCallStep,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _step_id() -> str:
    return f"step_{uuid.uuid4().hex[:8]}"


def _trace_id() -> str:
    return f"trace_{uuid.uuid4().hex[:12]}"


class _PendingToolCall:
    """Holds the mutable state of a timed tool call before it is committed."""

    def __init__(self) -> None:
        self.output: Any = None
        self.error: Optional[str] = None


class Emitter:
    """Instrument an agent run and produce an AgentTrace.

    Usage::

        emitter = Emitter(agent="my-agent", goal="Find top competitors")
        emitter.think("I should search first")
        emitter.tool_call("web_search", {"query": "AI agents 2026"}, output={...}, duration_ms=1200)
        emitter.respond("Here are the results", format="markdown", final=True)
        trace = emitter.finish()
        trace.save("run.atrace")

    For auto-timed tool calls::

        with emitter.time_tool_call("web_fetch", {"url": "https://..."}) as call:
            result = fetch(...)
            call.output = result
        # duration_ms is recorded automatically
    """

    def __init__(
        self,
        *,
        agent: str,
        goal: str,
        model: Optional[str] = None,
        agent_version: Optional[str] = None,
        input: Optional[str] = None,
        parent_trace_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None,
    ) -> None:
        self._agent = AgentInfo(name=agent, model=model, version=agent_version)
        self._goal = goal
        self._input = input
        self._parent_trace_id = parent_trace_id
        self._trace_id = trace_id or _trace_id()
        self._meta = meta
        self._started_at = _now()
        self._steps: List[AnyStep] = []

    # ------------------------------------------------------------------
    # Step methods
    # ------------------------------------------------------------------

    def think(
        self,
        reasoning: str,
        *,
        meta: Optional[Dict[str, Any]] = None,
        step_id: Optional[str] = None,
    ) -> ThinkStep:
        step = ThinkStep(
            id=step_id or _step_id(),
            started_at=_now(),
            reasoning=reasoning,
            meta=meta,
        )
        self._steps.append(step)
        return step

    def tool_call(
        self,
        tool: str,
        input: Dict[str, Any],
        *,
        output: Any = None,
        duration_ms: Optional[float] = None,
        error: Optional[str] = None,
        retry_of: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None,
        step_id: Optional[str] = None,
    ) -> ToolCallStep:
        now = _now()
        step = ToolCallStep(
            id=step_id or _step_id(),
            started_at=now,
            ended_at=now if duration_ms is not None else None,
            tool=tool,
            input=input,
            output=output,
            duration_ms=duration_ms,
            error=error,
            retry_of=retry_of,
            meta=meta,
        )
        self._steps.append(step)
        return step

    @contextmanager
    def time_tool_call(
        self,
        tool: str,
        input: Dict[str, Any],
        *,
        retry_of: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None,
        step_id: Optional[str] = None,
    ) -> Generator[_PendingToolCall, None, None]:
        """Context manager that auto-records duration_ms and ended_at."""
        sid = step_id or _step_id()
        started = _now()
        t0 = time.perf_counter()
        pending = _PendingToolCall()
        try:
            yield pending
        except Exception as exc:
            if pending.error is None:
                pending.error = str(exc)
            raise
        finally:
            elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)
            step = ToolCallStep(
                id=sid,
                started_at=started,
                ended_at=_now(),
                tool=tool,
                input=input,
                output=pending.output,
                duration_ms=elapsed_ms,
                error=pending.error,
                retry_of=retry_of,
                meta=meta,
            )
            self._steps.append(step)

    def respond(
        self,
        content: str,
        *,
        format: Optional[str] = None,
        final: bool = False,
        meta: Optional[Dict[str, Any]] = None,
        step_id: Optional[str] = None,
    ) -> RespondStep:
        step = RespondStep(
            id=step_id or _step_id(),
            started_at=_now(),
            content=content,
            format=format,
            final=final or None,
            meta=meta,
        )
        self._steps.append(step)
        return step

    def handoff(
        self,
        to_agent: str,
        task: str,
        *,
        child_trace_id: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None,
        step_id: Optional[str] = None,
    ) -> HandoffStep:
        step = HandoffStep(
            id=step_id or _step_id(),
            started_at=_now(),
            to_agent=to_agent,
            task=task,
            child_trace_id=child_trace_id,
            meta=meta,
        )
        self._steps.append(step)
        return step

    def error(
        self,
        message: str,
        *,
        code: Optional[str] = None,
        recoverable: Optional[bool] = None,
        meta: Optional[Dict[str, Any]] = None,
        step_id: Optional[str] = None,
    ) -> ErrorStep:
        step = ErrorStep(
            id=step_id or _step_id(),
            started_at=_now(),
            message=message,
            code=code,
            recoverable=recoverable,
            meta=meta,
        )
        self._steps.append(step)
        return step

    def memory(
        self,
        operation: str,
        *,
        store: Optional[str] = None,
        key: Optional[str] = None,
        value: Any = None,
        query: Optional[str] = None,
        results: Optional[List[Any]] = None,
        duration_ms: Optional[float] = None,
        error: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None,
        step_id: Optional[str] = None,
    ) -> MemoryStep:
        step = MemoryStep(
            id=step_id or _step_id(),
            started_at=_now(),
            operation=operation,
            store=store,
            key=key,
            value=value,
            query=query,
            results=results,
            duration_ms=duration_ms,
            error=error,
            meta=meta,
        )
        self._steps.append(step)
        return step

    def loop(
        self,
        iterations: List[List[AnyStep]],
        *,
        label: Optional[str] = None,
        max_iterations: Optional[int] = None,
        exit_reason: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None,
        step_id: Optional[str] = None,
    ) -> LoopStep:
        loop_iterations = [
            LoopIteration(index=i + 1, steps=steps)
            for i, steps in enumerate(iterations)
        ]
        step = LoopStep(
            id=step_id or _step_id(),
            started_at=_now(),
            label=label,
            max_iterations=max_iterations,
            exit_reason=exit_reason,
            iterations=loop_iterations,
            meta=meta,
        )
        self._steps.append(step)
        return step

    def custom(
        self,
        custom_type: str,
        *,
        data: Optional[Dict[str, Any]] = None,
        meta: Optional[Dict[str, Any]] = None,
        step_id: Optional[str] = None,
    ) -> CustomStep:
        step = CustomStep(
            id=step_id or _step_id(),
            started_at=_now(),
            custom_type=custom_type,
            data=data,
            meta=meta,
        )
        self._steps.append(step)
        return step

    # ------------------------------------------------------------------
    # Finalise
    # ------------------------------------------------------------------

    def finish(
        self,
        status: str = "completed",
        *,
        tokens: Optional[Dict[str, int]] = None,
    ) -> AgentTrace:
        """Close the trace and return an AgentTrace object."""
        token_counts = TokenCounts(**tokens) if tokens else None
        return AgentTrace(
            atrace="0.2.0",
            id=self._trace_id,
            agent=self._agent,
            goal=self._goal,
            input=self._input,
            status=status,
            started_at=self._started_at,
            ended_at=_now(),
            steps=self._steps,
            tokens=token_counts,
            parent_trace_id=self._parent_trace_id,
            meta=self._meta,
        )

    def fail(self, *, tokens: Optional[Dict[str, int]] = None) -> AgentTrace:
        """Shorthand for finish(status='failed')."""
        return self.finish("failed", tokens=tokens)
