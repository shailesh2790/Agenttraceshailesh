"""
example.py — AgentTrace + LangChain AgentExecutor integration demo.

Simulates a ReAct agent that uses tools to answer a question.
Produces a complete .atrace file without making real API calls.

Run:
    pip install agentrace langchain-core langchain
    python example.py
"""
from __future__ import annotations

from typing import Any, List, Optional
from unittest.mock import MagicMock

from agentrace_langchain import AgentTraceCallback

# ── Minimal LangChain stubs (avoids needing a real LLM key) ──────────────────

try:
    from langchain_core.agents import AgentAction, AgentFinish
except ImportError:
    raise SystemExit("Install: pip install langchain-core")


def simulate_agent_run(handler: AgentTraceCallback) -> str:
    """Walk through a typical ReAct loop by firing callbacks directly.

    In a real setup you would just do:
        agent_executor = AgentExecutor(agent=agent, tools=tools, callbacks=[handler])
        result = agent_executor.invoke({"input": "..."})
    """
    from uuid import uuid4

    run_id = uuid4()

    # ── Step 1: agent decides to search ──────────────────────────────────────
    action1 = AgentAction(
        tool="search",
        tool_input={"query": "current Python web frameworks 2024"},
        log=(
            "Thought: I need to find current information about Python web frameworks.\n"
            "Action: search\n"
            "Action Input: current Python web frameworks 2024"
        ),
    )
    handler.on_agent_action(action1, run_id=run_id)

    # Tool executes and returns
    handler.on_tool_end(
        '["FastAPI", "Django", "Flask", "Starlette", "Tornado"] — '
        "FastAPI leads in adoption for new APIs; Django remains dominant for full-stack apps.",
        run_id=run_id,
    )

    # ── Step 2: agent decides to look up one framework in detail ─────────────
    action2 = AgentAction(
        tool="lookup",
        tool_input={"topic": "FastAPI performance benchmarks"},
        log=(
            "Thought: FastAPI looks most promising. Let me get performance data.\n"
            "Action: lookup\n"
            "Action Input: FastAPI performance benchmarks"
        ),
    )
    handler.on_agent_action(action2, run_id=run_id)

    handler.on_tool_end(
        "FastAPI achieves ~42,000 req/s on standard hardware (uvicorn). "
        "Outperforms Flask by ~10x and approaches raw Starlette throughput.",
        run_id=run_id,
    )

    # ── Step 3: agent produces final answer ──────────────────────────────────
    finish = AgentFinish(
        return_values={
            "output": (
                "The top Python web frameworks in 2024 are:\n\n"
                "1. **FastAPI** — Best for high-performance APIs; async-native, "
                "auto-generates OpenAPI docs, ~42k req/s.\n"
                "2. **Django** — Full-stack batteries-included framework; ideal for "
                "rapid development with built-in admin, ORM, and auth.\n"
                "3. **Flask** — Lightweight micro-framework; great for small services "
                "where you want full control over components.\n\n"
                "For new REST APIs, FastAPI is the recommended choice for its performance "
                "and developer experience."
            )
        },
        log="Final Answer: ...",
    )
    handler.on_agent_finish(finish, run_id=run_id)

    return finish.return_values["output"]


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    handler = AgentTraceCallback(
        agent="python-expert",
        goal="Recommend the best Python web framework for a new project",
        model="gpt-4o",
        input="What is the best Python web framework to use in 2024?",
        agent_version="2.1.0",
    )

    output = simulate_agent_run(handler)

    trace = handler.get_trace(tokens={"input": 980, "output": 256})
    trace.save("example.atrace")

    print(f"Trace saved → example.atrace")
    print(f"Trace ID   : {trace.id}")
    print(f"Steps      : {len(trace.steps)}")
    for step in trace.steps:
        preview = getattr(step, "tool", None) or str(getattr(step, "content", ""))
        print(f"  [{step.type:10s}] {preview[:70]}")

    print(f"\nFinal answer:\n{output[:200]}...")


if __name__ == "__main__":
    main()
