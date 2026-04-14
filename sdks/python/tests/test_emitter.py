"""Tests for agentrace.Emitter."""
import json
import pathlib
import tempfile

import pytest

import sys
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from agentrace import Emitter, validate


def test_emitter_produces_valid_trace():
    e = Emitter(agent="test-agent", goal="Find something", model="claude-sonnet-4-6")
    e.think("I should search first")
    e.tool_call("web_search", {"query": "AI agents"}, output={"results": ["a", "b"]}, duration_ms=1200)
    e.respond("Here are the results", format="markdown", final=True)
    trace = e.finish()

    errors = validate(trace.to_dict())
    assert errors is None


def test_emitter_trace_fields():
    e = Emitter(
        agent="my-agent",
        goal="Do X",
        model="claude-sonnet-4-6",
        agent_version="1.0.0",
        input="Please do X",
    )
    trace = e.finish()

    assert trace.atrace == "0.2.0"
    assert trace.agent.name == "my-agent"
    assert trace.agent.model == "claude-sonnet-4-6"
    assert trace.agent.version == "1.0.0"
    assert trace.goal == "Do X"
    assert trace.input == "Please do X"
    assert trace.status == "completed"
    assert trace.started_at is not None
    assert trace.ended_at is not None


def test_emitter_all_step_types():
    e = Emitter(agent="test-agent", goal="All step types")

    think = e.think("Thinking...")
    assert think.type == "think"
    assert think.reasoning == "Thinking..."

    tool = e.tool_call("search", {"q": "x"}, output={"r": []}, duration_ms=500)
    assert tool.type == "tool_call"
    assert tool.tool == "search"
    assert tool.duration_ms == 500

    respond = e.respond("Done", format="text", final=True)
    assert respond.type == "respond"
    assert respond.final is True

    handoff = e.handoff("sub-agent", "Do part B", child_trace_id="trace_child")
    assert handoff.type == "handoff"
    assert handoff.to_agent == "sub-agent"

    err = e.error("Something failed", code="FAIL", recoverable=True)
    assert err.type == "error"
    assert err.code == "FAIL"

    mem = e.memory("write", store="cache", key="foo", value="bar")
    assert mem.type == "memory"
    assert mem.operation == "write"

    custom = e.custom("guardrail_check", data={"passed": True})
    assert custom.type == "custom"
    assert custom.custom_type == "guardrail_check"

    trace = e.finish()
    assert len(trace.steps) == 7


def test_emitter_fail():
    e = Emitter(agent="test-agent", goal="Will fail")
    e.error("Fatal error", code="FATAL")
    trace = e.fail()
    assert trace.status == "failed"


def test_emitter_tokens():
    e = Emitter(agent="test-agent", goal="With tokens")
    e.respond("Done", final=True)
    trace = e.finish(tokens={"input": 100, "output": 200, "total": 300})

    assert trace.tokens is not None
    assert trace.tokens.input == 100
    assert trace.tokens.output == 200
    assert trace.tokens.total == 300

    errors = validate(trace.to_dict())
    assert errors is None


def test_emitter_retry_of():
    e = Emitter(agent="test-agent", goal="Retry test")
    first = e.tool_call("api_get", {"url": "https://api.example.com"}, error="HTTP 503")
    retry = e.tool_call("api_get", {"url": "https://api.example.com"}, output={"data": 42}, retry_of=first.id)

    assert retry.retry_of == first.id
    errors = validate(e.finish().to_dict())
    assert errors is None


def test_emitter_time_tool_call():
    e = Emitter(agent="test-agent", goal="Timed call")

    with e.time_tool_call("slow_tool", {"x": 1}) as call:
        call.output = {"result": 42}

    trace = e.finish()
    step = trace.steps[0]
    assert step.type == "tool_call"
    assert step.output == {"result": 42}
    assert step.duration_ms is not None
    assert step.duration_ms >= 0

    errors = validate(trace.to_dict())
    assert errors is None


def test_emitter_save_and_reload(tmp_path):
    e = Emitter(agent="test-agent", goal="Save test")
    e.respond("Hello", final=True)
    trace = e.finish()

    out = tmp_path / "run.atrace"
    trace.save(str(out))

    with open(out, encoding="utf-8") as f:
        data = json.load(f)

    assert data["atrace"] == "0.2.0"
    assert data["agent"]["name"] == "test-agent"
    errors = validate(data)
    assert errors is None


def test_emitter_to_json_roundtrip():
    e = Emitter(agent="test-agent", goal="JSON test")
    e.think("Thinking")
    e.respond("Done", final=True)
    trace = e.finish()

    json_str = trace.to_json()
    data = json.loads(json_str)
    errors = validate(data)
    assert errors is None


def test_emitter_loop_step():
    e = Emitter(agent="test-agent", goal="Loop test")

    # Build iteration steps manually
    iter1_emitter = Emitter(agent="inner", goal="iter1")
    s1 = iter1_emitter.think("Step in iteration 1")

    iter2_emitter = Emitter(agent="inner", goal="iter2")
    s2 = iter2_emitter.think("Step in iteration 2")

    loop = e.loop(
        iterations=[[s1], [s2]],
        label="research_loop",
        max_iterations=5,
        exit_reason="goal_reached",
    )

    assert loop.type == "loop"
    assert len(loop.iterations) == 2
    assert loop.iterations[0].index == 1
    assert loop.iterations[1].index == 2

    errors = validate(e.finish().to_dict())
    assert errors is None


def test_step_ids_are_unique():
    e = Emitter(agent="test-agent", goal="Unique IDs")
    for _ in range(20):
        e.think("thinking")
    trace = e.finish()
    ids = [s.id for s in trace.steps]
    assert len(ids) == len(set(ids)), "Step IDs are not unique"
