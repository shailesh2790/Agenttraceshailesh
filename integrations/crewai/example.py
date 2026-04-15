"""
example.py — AgentTrace + CrewAI integration demo.

Simulates a two-agent crew: a researcher and a writer collaborating to
produce a competitive analysis report. Produces a complete .atrace file.

Run:
    pip install agentrace crewai
    python example.py
"""
from __future__ import annotations

from typing import Any
from uuid import uuid4

from agentrace_crewai import AgentTraceObserver

# ── Fake crewai types for demo purposes ──────────────────────────────────────
# In real usage these come from crewai automatically.

class FakeAgentAction:
    """Simulates crewai.agents.output_parser.AgentAction"""
    def __init__(self, tool: str, tool_input: Any, log: str = ""):
        self.tool = tool
        self.tool_input = tool_input
        self.log = log


class FakeTaskOutput:
    """Simulates crewai.tasks.task_output.TaskOutput"""
    def __init__(self, raw: str, agent: str):
        self.raw = raw
        self.agent = agent


# ── Simulated crew run ────────────────────────────────────────────────────────

def simulate_crew_run(observer: AgentTraceObserver) -> str:
    """Walk through a two-task crew execution by firing callbacks directly.

    In a real setup you would just do:
        crew = Crew(
            agents=[researcher, writer],
            tasks=[research_task, write_task],
            step_callback=observer.on_step,
            task_callback=observer.on_task,
        )
        result = crew.kickoff()
    """

    # ── Task 1: Researcher gathers competitive intelligence ──────────────────
    observer.record_handoff(
        to_agent="researcher",
        task="Research the top three competitors in the LLM API market",
    )

    # Researcher uses web_search
    observer.on_step(FakeAgentAction(
        tool="web_search",
        tool_input={"query": "LLM API market competitors 2024"},
        log=(
            "Thought: I need to gather data on LLM API providers.\n"
            "Action: web_search\n"
            "Action Input: LLM API market competitors 2024"
        ),
    ))

    # Tool result comes in
    class FakeResult:
        result = (
            '{"providers": ["OpenAI", "Anthropic", "Google DeepMind", "Cohere", "Mistral AI"],'
            '"market_share": {"OpenAI": "55%", "Anthropic": "20%", "Google": "15%", "other": "10%"}}'
        )
    observer.on_step(FakeResult())

    # Researcher uses another tool
    observer.on_step(FakeAgentAction(
        tool="fetch_pricing",
        tool_input={"providers": ["OpenAI", "Anthropic", "Google"]},
        log=(
            "Thought: Now I need pricing data to complete the comparison.\n"
            "Action: fetch_pricing\n"
            "Action Input: [\"OpenAI\", \"Anthropic\", \"Google\"]"
        ),
    ))

    class FakePricingResult:
        result = (
            "OpenAI gpt-4o: $5/M input, $15/M output. "
            "Anthropic claude-sonnet-4-6: $3/M input, $15/M output. "
            "Google gemini-1.5-pro: $3.5/M input, $10.5/M output."
        )
    observer.on_step(FakePricingResult())

    # Task 1 completes
    observer.on_task(FakeTaskOutput(
        raw=(
            "Competitive Intelligence Report:\n"
            "• OpenAI leads with ~55% market share; strong ecosystem\n"
            "• Anthropic at ~20%; best-in-class safety and extended thinking\n"
            "• Google DeepMind at ~15%; multimodal strength with Gemini\n"
            "Pricing: Anthropic offers the best input-token pricing at $3/M."
        ),
        agent="researcher",
    ))

    # ── Task 2: Writer drafts the final report ────────────────────────────────
    observer.record_handoff(
        to_agent="writer",
        task="Draft an executive summary of the competitive analysis",
    )

    observer.on_step(FakeAgentAction(
        tool="format_report",
        tool_input={"style": "executive_summary", "length": "concise"},
        log=(
            "Thought: I have all the data. I'll format it as a clean executive summary.\n"
            "Action: format_report\n"
            "Action Input: {\"style\": \"executive_summary\", \"length\": \"concise\"}"
        ),
    ))

    class FakeFormatResult:
        result = "Report formatted with executive summary structure."
    observer.on_step(FakeFormatResult())

    final_report = (
        "## LLM API Competitive Analysis — Executive Summary\n\n"
        "**Market Overview**\n"
        "The LLM API market is dominated by three providers: OpenAI (55%), Anthropic (20%), "
        "and Google DeepMind (15%).\n\n"
        "**Key Findings**\n"
        "- OpenAI maintains the largest ecosystem and developer mindshare\n"
        "- Anthropic offers the best safety story and competitive input pricing ($3/M tokens)\n"
        "- Google excels in multimodal tasks with Gemini's vision capabilities\n\n"
        "**Recommendation**\n"
        "For safety-critical applications: Anthropic. For breadth of integrations: OpenAI. "
        "For multimodal or Google Cloud workloads: Google DeepMind."
    )

    observer.on_task(FakeTaskOutput(
        raw=final_report,
        agent="writer",
    ))

    observer.record_final_output(final_report)
    return final_report


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    observer = AgentTraceObserver(
        agent="crew-orchestrator",
        goal="Produce a competitive analysis of LLM API providers",
        model="gpt-4o",
        input="Analyze the top LLM API competitors and produce an executive summary",
        agent_version="1.0.0",
    )

    output = simulate_crew_run(observer)

    trace = observer.get_trace(tokens={"input": 2100, "output": 520})
    trace.save("example.atrace")

    print(f"Trace saved → example.atrace")
    print(f"Trace ID   : {trace.id}")
    print(f"Steps      : {len(trace.steps)}")
    for step in trace.steps:
        preview = getattr(step, "tool", None) or str(getattr(step, "content", getattr(step, "data", "")))
        print(f"  [{step.type:10s}] {str(preview)[:70]}")


if __name__ == "__main__":
    main()
