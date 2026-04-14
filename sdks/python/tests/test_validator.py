"""Tests for agentrace.validate()."""
import json
import pathlib

import pytest

import sys
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from agentrace import validate

EXAMPLES_V01 = pathlib.Path(__file__).parent.parent.parent.parent / "spec" / "v0.1" / "examples"
EXAMPLES_V02 = pathlib.Path(__file__).parent.parent.parent.parent / "spec" / "v0.2" / "examples"


def load(path: pathlib.Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# v0.2 examples — must all pass
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("filename", [
    "memory-agent.atrace",
    "react-loop.atrace",
    "retry-with-backoff.atrace",
    "custom-steps.atrace",
])
def test_v02_examples_are_valid(filename):
    trace = load(EXAMPLES_V02 / filename)
    errors = validate(trace)
    assert errors is None, f"{filename} failed validation: {errors}"


# ---------------------------------------------------------------------------
# Invalid traces — must all fail
# ---------------------------------------------------------------------------

def test_missing_required_field():
    trace = {
        "atrace": "0.2.0",
        "id": "trace_001",
        # "agent" is missing
        "goal": "Do something",
        "status": "completed",
        "started_at": "2026-04-14T10:00:00Z",
        "steps": [],
    }
    errors = validate(trace)
    assert errors is not None
    assert len(errors) > 0


def test_invalid_status():
    trace = {
        "atrace": "0.2.0",
        "id": "trace_001",
        "agent": {"name": "test-agent"},
        "goal": "Do something",
        "status": "unknown_status",
        "started_at": "2026-04-14T10:00:00Z",
        "steps": [],
    }
    errors = validate(trace)
    assert errors is not None


def test_invalid_step_type():
    trace = {
        "atrace": "0.2.0",
        "id": "trace_001",
        "agent": {"name": "test-agent"},
        "goal": "Do something",
        "status": "completed",
        "started_at": "2026-04-14T10:00:00Z",
        "steps": [
            {
                "id": "step_1",
                "type": "unknown_type",
                "started_at": "2026-04-14T10:00:01Z",
            }
        ],
    }
    errors = validate(trace)
    assert errors is not None


def test_empty_goal_fails():
    trace = {
        "atrace": "0.2.0",
        "id": "trace_001",
        "agent": {"name": "test-agent"},
        "goal": "",
        "status": "completed",
        "started_at": "2026-04-14T10:00:00Z",
        "steps": [],
    }
    errors = validate(trace)
    assert errors is not None


def test_tool_call_missing_input():
    trace = {
        "atrace": "0.2.0",
        "id": "trace_001",
        "agent": {"name": "test-agent"},
        "goal": "Do something",
        "status": "completed",
        "started_at": "2026-04-14T10:00:00Z",
        "steps": [
            {
                "id": "step_1",
                "type": "tool_call",
                "started_at": "2026-04-14T10:00:01Z",
                "tool": "web_search",
                # "input" is missing — required field
            }
        ],
    }
    errors = validate(trace)
    assert errors is not None


# ---------------------------------------------------------------------------
# Minimal valid trace
# ---------------------------------------------------------------------------

def test_minimal_valid_trace():
    trace = {
        "atrace": "0.2.0",
        "id": "trace_min",
        "agent": {"name": "test-agent"},
        "goal": "Do something",
        "status": "completed",
        "started_at": "2026-04-14T10:00:00Z",
        "steps": [],
    }
    errors = validate(trace)
    assert errors is None


def test_tokens_field_optional_fields():
    trace = {
        "atrace": "0.2.0",
        "id": "trace_min",
        "agent": {"name": "test-agent"},
        "goal": "Do something",
        "status": "completed",
        "started_at": "2026-04-14T10:00:00Z",
        "steps": [],
        "tokens": {"total": 1000},
    }
    errors = validate(trace)
    assert errors is None


def test_memory_step_valid():
    trace = {
        "atrace": "0.2.0",
        "id": "trace_mem",
        "agent": {"name": "test-agent"},
        "goal": "Remember something",
        "status": "completed",
        "started_at": "2026-04-14T10:00:00Z",
        "steps": [
            {
                "id": "step_1",
                "type": "memory",
                "started_at": "2026-04-14T10:00:01Z",
                "operation": "write",
                "store": "session",
                "key": "user_name",
                "value": "Priya",
            }
        ],
    }
    errors = validate(trace)
    assert errors is None


def test_custom_step_valid():
    trace = {
        "atrace": "0.2.0",
        "id": "trace_custom",
        "agent": {"name": "test-agent"},
        "goal": "Run a guardrail",
        "status": "completed",
        "started_at": "2026-04-14T10:00:00Z",
        "steps": [
            {
                "id": "step_1",
                "type": "custom",
                "started_at": "2026-04-14T10:00:01Z",
                "custom_type": "guardrail_check",
                "data": {"passed": True},
            }
        ],
    }
    errors = validate(trace)
    assert errors is None
