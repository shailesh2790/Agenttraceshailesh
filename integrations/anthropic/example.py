"""
example.py — AgentTrace + Anthropic SDK integration demo.

Simulates a research agent that uses tools to gather information and
synthesizes a final answer. Produces a complete .atrace file.

Run:
    pip install agentrace anthropic
    python example.py
"""
from __future__ import annotations

import json
from typing import Any, Dict

from agentrace_anthropic import AnthropicTracer

# ── Simulated tool implementations ──────────────────────────────────────────

TOOLS = [
    {
        "name": "web_search",
        "description": "Search the web for information on a topic.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "fetch_page",
        "description": "Fetch and extract text content from a URL.",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "URL to fetch"},
            },
            "required": ["url"],
        },
    },
]


def execute_tool(name: str, tool_input: Dict[str, Any]) -> str:
    """Stub: return realistic-looking tool results without real API calls."""
    if name == "web_search":
        query = tool_input.get("query", "")
        return json.dumps({
            "results": [
                {
                    "title": "Top AI Agent Frameworks in 2024",
                    "url": "https://example.com/ai-agent-frameworks",
                    "snippet": "LangChain, CrewAI, AutoGen, and LlamaIndex lead the space...",
                },
                {
                    "title": "Comparing Multi-Agent Frameworks",
                    "url": "https://example.com/compare-frameworks",
                    "snippet": "Feature comparison: orchestration, memory, tool use...",
                },
            ]
        })
    elif name == "fetch_page":
        url = tool_input.get("url", "")
        return (
            "LangChain: General-purpose LLM application framework with extensive tool "
            "ecosystem and LCEL chain composition. CrewAI: Role-based multi-agent "
            "orchestration with built-in collaboration. AutoGen: Microsoft's conversation-"
            "based agent framework with code execution support. LlamaIndex: Focused on "
            "RAG and data-grounded agents."
        )
    return "No result."


# ── Simulated Anthropic API responses ────────────────────────────────────────

class FakeBlock:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


class FakeResponse:
    def __init__(self, content, stop_reason="tool_use"):
        self.content = content
        self.stop_reason = stop_reason


# Simulate turn 1: agent decides to search
TURN1 = FakeResponse(
    content=[
        FakeBlock(
            type="thinking",
            thinking=(
                "The user wants to know the top AI agent frameworks. I should search for "
                "current information since this space evolves quickly."
            ),
        ),
        FakeBlock(
            type="tool_use",
            id="tool_1_search",
            name="web_search",
            input={"query": "top AI agent frameworks 2024 comparison"},
        ),
    ],
    stop_reason="tool_use",
)

# Simulate turn 2: agent decides to fetch a page
TURN2 = FakeResponse(
    content=[
        FakeBlock(
            type="thinking",
            thinking=(
                "The search returned good results. Let me fetch the comparison page for "
                "more detailed information before writing my answer."
            ),
        ),
        FakeBlock(
            type="tool_use",
            id="tool_2_fetch",
            name="fetch_page",
            input={"url": "https://example.com/compare-frameworks"},
        ),
    ],
    stop_reason="tool_use",
)

# Simulate turn 3: final answer
TURN3 = FakeResponse(
    content=[
        FakeBlock(
            type="text",
            text=(
                "Based on my research, the top AI agent frameworks in 2024 are:\n\n"
                "1. **LangChain** — The most widely adopted framework with a rich tool "
                "ecosystem, LCEL for composing chains, and strong community support.\n\n"
                "2. **CrewAI** — Purpose-built for multi-agent orchestration with a "
                "role-based design that makes agent collaboration intuitive.\n\n"
                "3. **AutoGen** (Microsoft) — Excels at code-executing agents and "
                "conversation-driven multi-agent scenarios.\n\n"
                "4. **LlamaIndex** — The go-to choice for RAG-heavy agents that need "
                "to ground responses in proprietary documents.\n\n"
                "Each framework has distinct strengths; the best choice depends on "
                "whether you need broad tooling (LangChain), multi-agent teamwork "
                "(CrewAI), code generation (AutoGen), or data retrieval (LlamaIndex)."
            ),
        ),
    ],
    stop_reason="end_turn",
)


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    tracer = AnthropicTracer(
        agent="research-agent",
        goal="Find and compare the top AI agent frameworks",
        model="claude-sonnet-4-6",
        input="What are the top AI agent frameworks and how do they compare?",
        agent_version="1.0.0",
    )

    # ── Turn 1 ──
    tracer.record_response(TURN1)
    for block in TURN1.content:
        if block.type == "tool_use":
            result = execute_tool(block.name, block.input)
            tracer.record_tool_result(block.id, result)

    # ── Turn 2 ──
    tracer.record_response(TURN2)
    for block in TURN2.content:
        if block.type == "tool_use":
            result = execute_tool(block.name, block.input)
            tracer.record_tool_result(block.id, result)

    # ── Turn 3 ──
    tracer.record_response(TURN3)

    # ── Finish ──
    trace = tracer.finish(
        "completed",
        tokens={"input": 1842, "output": 387},
    )

    out_path = "example.atrace"
    trace.save(out_path)
    print(f"Trace saved → {out_path}")
    print(f"Trace ID   : {trace.id}")
    print(f"Steps      : {len(trace.steps)}")
    for step in trace.steps:
        print(f"  [{step.type:10s}] {getattr(step, 'tool', getattr(step, 'content', ''))!s:.60s}")


if __name__ == "__main__":
    main()
