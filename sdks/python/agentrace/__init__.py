"""AgentTrace Python SDK.

Validate and emit .atrace files — the open standard for recording what AI agents do.

Quick start::

    from agentrace import Emitter, validate

    # Instrument your agent
    emitter = Emitter(agent="my-agent", goal="Find top competitors", model="claude-sonnet-4-6")
    emitter.think("I should search first")
    emitter.tool_call("web_search", {"query": "AI agents 2026"}, output={"results": [...]}, duration_ms=1200)
    emitter.respond("Here are the top results", format="markdown", final=True)

    trace = emitter.finish()
    trace.save("run.atrace")

    # Validate any trace dict
    import json
    with open("run.atrace") as f:
        data = json.load(f)
    errors = validate(data)  # None if valid
"""

from ._emitter import Emitter
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
from ._validator import validate

__all__ = [
    # Core
    "Emitter",
    "validate",
    # Trace model
    "AgentTrace",
    "AgentInfo",
    "TokenCounts",
    # Step models
    "AnyStep",
    "ThinkStep",
    "ToolCallStep",
    "RespondStep",
    "HandoffStep",
    "ErrorStep",
    "MemoryStep",
    "LoopStep",
    "LoopIteration",
    "CustomStep",
]

__version__ = "0.2.0"
