"""Tests for the agentrace CLI."""
import json
import pathlib
import sys

import pytest
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from click.testing import CliRunner
from agentrace.cli import main

EXAMPLES = pathlib.Path(__file__).parent.parent.parent.parent / "spec" / "v0.2" / "examples"
EXAMPLES_V1 = pathlib.Path(__file__).parent.parent.parent.parent / "spec" / "v0.1" / "examples"


def example(name: str) -> str:
    return str(EXAMPLES / name)


# ─── validate ─────────────────────────────────────────────────────────────────

class TestValidate:
    def test_valid_file_exits_0(self):
        runner = CliRunner()
        result = runner.invoke(main, ["validate", example("memory-agent.atrace")])
        assert result.exit_code == 0
        assert "✓" in result.output

    def test_multiple_valid_files(self):
        runner = CliRunner()
        result = runner.invoke(main, [
            "validate",
            example("memory-agent.atrace"),
            example("react-loop.atrace"),
            example("custom-steps.atrace"),
        ])
        assert result.exit_code == 0
        assert result.output.count("✓") == 3

    def test_invalid_file_exits_1(self, tmp_path):
        bad = tmp_path / "bad.atrace"
        bad.write_text(json.dumps({
            "atrace": "0.2.0",
            "id": "trace_001",
            # missing agent, goal, status, started_at, steps
        }))
        runner = CliRunner()
        result = runner.invoke(main, ["validate", str(bad)])
        assert result.exit_code == 1
        assert "✗" in result.output

    def test_invalid_json_exits_1(self, tmp_path):
        bad = tmp_path / "bad.atrace"
        bad.write_text("{not valid json")
        runner = CliRunner()
        result = runner.invoke(main, ["validate", str(bad)])
        assert result.exit_code == 1

    def test_mixed_valid_invalid_exits_1(self, tmp_path):
        bad = tmp_path / "bad.atrace"
        bad.write_text(json.dumps({"atrace": "0.2.0"}))
        runner = CliRunner()
        result = runner.invoke(main, [
            "validate",
            example("memory-agent.atrace"),
            str(bad),
        ])
        assert result.exit_code == 1
        assert "✓" in result.output
        assert "✗" in result.output


# ─── view ─────────────────────────────────────────────────────────────────────

class TestView:
    @pytest.mark.parametrize("filename", [
        "memory-agent.atrace",
        "react-loop.atrace",
        "retry-with-backoff.atrace",
        "custom-steps.atrace",
    ])
    def test_view_v02_examples(self, filename):
        runner = CliRunner()
        result = runner.invoke(main, ["view", example(filename)])
        assert result.exit_code == 0
        assert len(result.output) > 0

    def test_view_shows_trace_id(self):
        runner = CliRunner()
        result = runner.invoke(main, ["view", example("memory-agent.atrace")])
        assert result.exit_code == 0
        assert "trace_memory_001" in result.output

    def test_view_shows_step_content(self):
        # Check content from different step types rather than type names
        # (Rich may collapse the type column at narrow terminal widths)
        runner = CliRunner()
        result = runner.invoke(main, ["view", example("memory-agent.atrace")])
        assert result.exit_code == 0
        # memory step content
        assert "user_profiles" in result.output
        # respond step: "final" tag appears
        assert "final" in result.output

    def test_view_shows_loop_iterations(self):
        runner = CliRunner()
        result = runner.invoke(main, ["view", example("react-loop.atrace")])
        assert result.exit_code == 0
        assert "loop" in result.output
        assert "iter" in result.output

    def test_view_empty_steps(self, tmp_path):
        trace = tmp_path / "empty.atrace"
        trace.write_text(json.dumps({
            "atrace": "0.2.0",
            "id": "trace_empty",
            "agent": {"name": "test"},
            "goal": "Nothing to do",
            "status": "completed",
            "started_at": "2026-04-14T10:00:00Z",
            "steps": [],
        }))
        runner = CliRunner()
        result = runner.invoke(main, ["view", str(trace)])
        assert result.exit_code == 0
        assert "no steps" in result.output


# ─── stats ────────────────────────────────────────────────────────────────────

class TestStats:
    @pytest.mark.parametrize("filename", [
        "memory-agent.atrace",
        "react-loop.atrace",
        "retry-with-backoff.atrace",
        "custom-steps.atrace",
    ])
    def test_stats_v02_examples(self, filename):
        runner = CliRunner()
        result = runner.invoke(main, ["stats", example(filename)])
        assert result.exit_code == 0
        assert len(result.output) > 0

    def test_stats_shows_duration(self):
        runner = CliRunner()
        result = runner.invoke(main, ["stats", example("retry-with-backoff.atrace")])
        assert result.exit_code == 0
        assert "duration" in result.output

    def test_stats_shows_tokens(self):
        runner = CliRunner()
        result = runner.invoke(main, ["stats", example("memory-agent.atrace")])
        assert result.exit_code == 0
        assert "tokens" in result.output

    def test_stats_shows_tool_breakdown(self):
        runner = CliRunner()
        result = runner.invoke(main, ["stats", example("react-loop.atrace")])
        assert result.exit_code == 0
        assert "tool calls" in result.output

    def test_stats_shows_retry_count(self):
        runner = CliRunner()
        result = runner.invoke(main, ["stats", example("retry-with-backoff.atrace")])
        assert result.exit_code == 0
        assert "retries" in result.output

    def test_stats_counts_nested_loop_steps(self):
        """Stats should count steps inside loop iterations."""
        runner = CliRunner()
        result = runner.invoke(main, ["stats", example("react-loop.atrace")])
        assert result.exit_code == 0
        # react-loop has a loop with 3 iterations containing multiple steps each
        assert "think" in result.output
        assert "tool_call" in result.output


# ─── diff ─────────────────────────────────────────────────────────────────────

class TestDiff:
    def test_diff_identical_exits_0(self):
        runner = CliRunner()
        f = example("memory-agent.atrace")
        result = runner.invoke(main, ["diff", f, f])
        assert result.exit_code == 0

    def test_diff_different_exits_1(self):
        runner = CliRunner()
        result = runner.invoke(main, [
            "diff",
            example("memory-agent.atrace"),
            example("react-loop.atrace"),
        ])
        assert result.exit_code == 1

    def test_diff_shows_step_comparison(self):
        runner = CliRunner()
        result = runner.invoke(main, [
            "diff",
            example("memory-agent.atrace"),
            example("react-loop.atrace"),
        ])
        assert "steps" in result.output

    def test_diff_same_file_shows_unchanged(self):
        runner = CliRunner()
        f = example("retry-with-backoff.atrace")
        result = runner.invoke(main, ["diff", f, f])
        assert "unchanged" in result.output

    def test_diff_detects_status_change(self, tmp_path):
        base = {
            "atrace": "0.2.0", "id": "t1", "agent": {"name": "a"},
            "goal": "g", "started_at": "2026-04-14T10:00:00Z",
            "status": "completed", "steps": [],
        }
        a = tmp_path / "a.atrace"
        b = tmp_path / "b.atrace"
        a.write_text(json.dumps(base))
        b.write_text(json.dumps({**base, "status": "failed"}))

        runner = CliRunner()
        result = runner.invoke(main, ["diff", str(a), str(b)])
        assert result.exit_code == 1
        assert "status" in result.output
        assert "failed" in result.output

    def test_diff_detects_added_step(self, tmp_path):
        step = {"id": "s1", "type": "think", "started_at": "2026-04-14T10:00:01Z", "reasoning": "hi"}
        base = {
            "atrace": "0.2.0", "id": "t1", "agent": {"name": "a"},
            "goal": "g", "started_at": "2026-04-14T10:00:00Z",
            "status": "completed", "steps": [],
        }
        a = tmp_path / "a.atrace"
        b = tmp_path / "b.atrace"
        a.write_text(json.dumps(base))
        b.write_text(json.dumps({**base, "steps": [step]}))

        runner = CliRunner()
        result = runner.invoke(main, ["diff", str(a), str(b)])
        assert result.exit_code == 1
        assert "added" in result.output


# ─── help / version ───────────────────────────────────────────────────────────

class TestMeta:
    def test_help(self):
        runner = CliRunner()
        result = runner.invoke(main, ["--help"])
        assert result.exit_code == 0
        assert "validate" in result.output
        assert "view" in result.output
        assert "stats" in result.output
        assert "diff" in result.output

    def test_version(self):
        runner = CliRunner()
        result = runner.invoke(main, ["--version"])
        assert result.exit_code == 0
        assert "0.2.0" in result.output
