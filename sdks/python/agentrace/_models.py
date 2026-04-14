from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field


class AgentInfo(BaseModel):
    name: str
    model: Optional[str] = None
    version: Optional[str] = None


class TokenCounts(BaseModel):
    input: Optional[int] = None
    output: Optional[int] = None
    cache_read: Optional[int] = None
    cache_write: Optional[int] = None
    total: Optional[int] = None


class BaseStep(BaseModel):
    id: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    retry_of: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


class ThinkStep(BaseStep):
    type: Literal["think"] = "think"
    reasoning: str


class ToolCallStep(BaseStep):
    type: Literal["tool_call"] = "tool_call"
    tool: str
    input: Dict[str, Any]
    output: Optional[Any] = None
    duration_ms: Optional[float] = None
    error: Optional[str] = None


class RespondStep(BaseStep):
    type: Literal["respond"] = "respond"
    content: str
    format: Optional[Literal["text", "markdown", "json", "html"]] = None
    final: Optional[bool] = None


class HandoffStep(BaseStep):
    type: Literal["handoff"] = "handoff"
    to_agent: str
    task: str
    child_trace_id: Optional[str] = None


class ErrorStep(BaseStep):
    type: Literal["error"] = "error"
    message: str
    code: Optional[str] = None
    recoverable: Optional[bool] = None


class MemoryStep(BaseStep):
    type: Literal["memory"] = "memory"
    operation: Literal["read", "write", "delete", "search"]
    store: Optional[str] = None
    key: Optional[str] = None
    value: Optional[Any] = None
    query: Optional[str] = None
    results: Optional[List[Any]] = None
    duration_ms: Optional[float] = None
    error: Optional[str] = None


class LoopIteration(BaseModel):
    index: int
    steps: List[AnyStep] = Field(default_factory=list)


class LoopStep(BaseStep):
    type: Literal["loop"] = "loop"
    label: Optional[str] = None
    max_iterations: Optional[int] = None
    exit_reason: Optional[str] = None
    iterations: List[LoopIteration] = Field(default_factory=list)


class CustomStep(BaseStep):
    type: Literal["custom"] = "custom"
    custom_type: str
    data: Optional[Dict[str, Any]] = None


AnyStep = Annotated[
    Union[
        ThinkStep,
        ToolCallStep,
        RespondStep,
        HandoffStep,
        ErrorStep,
        MemoryStep,
        LoopStep,
        CustomStep,
    ],
    Field(discriminator="type"),
]

# Resolve forward references for recursive loop structure
LoopIteration.model_rebuild()
LoopStep.model_rebuild()


class AgentTrace(BaseModel):
    atrace: str = "0.2.0"
    id: str
    agent: AgentInfo
    goal: str
    input: Optional[str] = None
    status: Literal["running", "completed", "failed", "cancelled"]
    started_at: datetime
    ended_at: Optional[datetime] = None
    steps: List[AnyStep] = Field(default_factory=list)
    tokens: Optional[TokenCounts] = None
    parent_trace_id: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

    def to_dict(self) -> dict:
        return self.model_dump(mode="json", exclude_none=True)

    def to_json(self, indent: int = 2) -> str:
        import json
        return json.dumps(self.to_dict(), indent=indent, default=str)

    def save(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.to_json())
