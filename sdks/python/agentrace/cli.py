"""AgentTrace CLI — validate, view, diff, and analyse .atrace files."""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from ._validator import validate

console = Console()
err = Console(stderr=True, highlight=False)

# ─── helpers ──────────────────────────────────────────────────────────────────

STEP_STYLE: Dict[str, Tuple[str, str]] = {
    "think":     ("◌", "dim"),
    "tool_call": ("⬡", "yellow"),
    "respond":   ("◎", "green"),
    "handoff":   ("→", "blue"),
    "error":     ("✗", "red bold"),
    "memory":    ("◈", "cyan"),
    "loop":      ("↻", "steel_blue1"),
    "custom":    ("◆", "magenta"),
}

STATUS_STYLE = {
    "completed": "[green]✓ completed[/green]",
    "failed":    "[red]✗ failed[/red]",
    "running":   "[yellow]⋯ running[/yellow]",
    "cancelled": "[dim]⊘ cancelled[/dim]",
}


def _load(path: str) -> dict:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        err.print(f"[red]File not found:[/red] {path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        err.print(f"[red]Invalid JSON:[/red] {e}")
        sys.exit(1)


def _parse_dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def _elapsed_str(start: Optional[datetime], end: Optional[datetime]) -> str:
    if not start or not end:
        return ""
    secs = (end - start).total_seconds()
    if secs < 60:
        return f"{secs:.1f}s"
    m, s = divmod(int(secs), 60)
    return f"{m}m {s}s"


def _offset_str(trace_start: Optional[datetime], step_start: Optional[str]) -> str:
    if not trace_start or not step_start:
        return ""
    dt = _parse_dt(step_start)
    if not dt:
        return ""
    delta = (dt - trace_start).total_seconds()
    return f"+{delta:.1f}s"


def _dur_str(ms: Optional[float]) -> str:
    if ms is None:
        return ""
    if ms < 1000:
        return f"{ms:.0f}ms"
    return f"{ms / 1000:.1f}s"


def _truncate(s: str, n: int = 70) -> str:
    s = s.replace("\n", " ").strip()
    return s if len(s) <= n else s[:n - 1] + "…"


def _step_content(step: dict) -> str:
    t = step.get("type", "")
    if t == "think":
        return _truncate(step.get("reasoning", ""), 72)
    if t == "tool_call":
        tool = step.get("tool", "")
        raw = json.dumps(step.get("input", {}), separators=(",", ":"))
        return f"{tool} › {_truncate(raw, 55)}"
    if t == "respond":
        return _truncate(step.get("content", ""), 72)
    if t == "handoff":
        return f"→ {step.get('to_agent','')} · {_truncate(step.get('task',''), 50)}"
    if t == "error":
        return _truncate(step.get("message", ""), 72)
    if t == "memory":
        op = step.get("operation", "")
        store = step.get("store", "")
        key = step.get("key", "") or step.get("query", "")
        parts = [p for p in [store, key] if p]
        return f"{op} {'/'.join(parts)}" if parts else op
    if t == "loop":
        label = step.get("label", "")
        n = len(step.get("iterations", []))
        suffix = f"{n} iteration{'s' if n != 1 else ''}"
        return f"{label}  ({suffix})" if label else suffix
    if t == "custom":
        return step.get("custom_type", "")
    return ""


def _step_tags(step: dict) -> str:
    tags = []
    t = step.get("type", "")
    if t == "tool_call":
        tags.append(_dur_str(step.get("duration_ms")))
        if step.get("error"):
            tags.append("[red]error[/red]")
    if t == "memory":
        tags.append(_dur_str(step.get("duration_ms")))
    if t == "respond" and step.get("final"):
        tags.append("[dim]final[/dim]")
    if step.get("retry_of"):
        tags.append("[dim]retry[/dim]")
    return "  ".join(t for t in tags if t)


def _flatten_steps(steps: List[dict]) -> List[dict]:
    """Recursively collect all steps including those inside loop iterations."""
    out = []
    for s in steps:
        out.append(s)
        if s.get("type") == "loop":
            for it in s.get("iterations", []):
                out.extend(_flatten_steps(it.get("steps", [])))
    return out


# ─── view renderer ────────────────────────────────────────────────────────────

def _render_steps(
    steps: List[dict],
    table: Table,
    trace_start: Optional[datetime],
    counter: List[int],
    indent: int = 0,
) -> None:
    pad = "  " * indent
    for step in steps:
        counter[0] += 1
        n = counter[0]
        t = step.get("type", "unknown")
        icon, style = STEP_STYLE.get(t, ("?", "white"))
        offset = _offset_str(trace_start, step.get("started_at"))
        content = _step_content(step)
        tags = _step_tags(step)

        num_text = Text(f"{pad}{n}", style="dim")
        type_text = Text(f"{icon} {t}", style=style)
        table.add_row(num_text, type_text, offset, content, tags)

        if t == "loop":
            for it in step.get("iterations", []):
                idx = it.get("index", "?")
                table.add_row(
                    Text(f"{pad}  ", style="dim"),
                    Text(f"┌ iter {idx}", style="dim"),
                    "", "", "",
                )
                _render_steps(it.get("steps", []), table, trace_start, counter, indent + 2)


def _view_trace(data: dict) -> None:
    trace_id = data.get("id", "—")
    agent = data.get("agent", {})
    agent_str = agent.get("name", "—")
    if agent.get("version"):
        agent_str += f" v{agent['version']}"
    if agent.get("model"):
        agent_str += f"  [dim]{agent['model']}[/dim]"

    goal = _truncate(data.get("goal", "—"), 80)
    status_raw = data.get("status", "—")
    status_str = STATUS_STYLE.get(status_raw, status_raw)

    start_dt = _parse_dt(data.get("started_at"))
    end_dt = _parse_dt(data.get("ended_at"))
    time_str = ""
    if start_dt:
        time_str = start_dt.strftime("%H:%M:%S")
        if end_dt:
            time_str += f" → {end_dt.strftime('%H:%M:%S')}  [dim]({_elapsed_str(start_dt, end_dt)})[/dim]"

    tokens = data.get("tokens") or {}
    # also check meta for legacy token fields
    meta = data.get("meta") or {}
    total = tokens.get("total") or meta.get("total_tokens")
    cost = meta.get("total_cost_usd")
    token_str = ""
    if total:
        token_str = f"{total:,} tokens"
        inp = tokens.get("input")
        out = tokens.get("output")
        if inp and out:
            token_str += f"  [dim](in {inp:,} · out {out:,})[/dim]"
        if cost:
            token_str += f"  [dim]${cost:.4f}[/dim]"

    # Header panel
    info = Table.grid(padding=(0, 2))
    info.add_column(style="dim", width=8)
    info.add_column()
    info.add_row("agent", agent_str)
    info.add_row("goal", goal)
    info.add_row("status", status_str)
    if time_str:
        info.add_row("time", time_str)
    if token_str:
        info.add_row("tokens", token_str)

    console.print(Panel(info, title=f"[bold]{trace_id}[/bold]", expand=False))
    console.print()

    # Steps table
    steps = data.get("steps", [])
    if not steps:
        console.print("[dim]  (no steps)[/dim]")
        return

    table = Table(
        show_header=True,
        header_style="bold dim",
        box=None,
        padding=(0, 1),
        expand=False,
    )
    table.add_column("#", style="dim", width=5)
    table.add_column("type", min_width=14)
    table.add_column("offset", style="dim", width=8, justify="right")
    table.add_column("content", min_width=40, max_width=72, no_wrap=True)
    table.add_column("info", style="dim", width=14, justify="right")

    counter = [0]
    _render_steps(steps, table, start_dt, counter)
    console.print(table)


# ─── stats renderer ───────────────────────────────────────────────────────────

def _stats_trace(data: dict) -> None:
    trace_id = data.get("id", "—")
    start_dt = _parse_dt(data.get("started_at"))
    end_dt = _parse_dt(data.get("ended_at"))

    all_steps = _flatten_steps(data.get("steps", []))

    # Counts by type
    type_counts: Dict[str, int] = {}
    tool_durations: Dict[str, List[float]] = {}
    retry_count = 0
    error_count = 0

    for step in all_steps:
        t = step.get("type", "unknown")
        type_counts[t] = type_counts.get(t, 0) + 1
        if step.get("retry_of"):
            retry_count += 1
        if t == "error":
            error_count += 1
        if t == "tool_call":
            tool = step.get("tool", "unknown")
            ms = step.get("duration_ms")
            if ms is not None:
                tool_durations.setdefault(tool, []).append(ms)

    tokens = data.get("tokens") or {}
    meta = data.get("meta") or {}
    total_tokens = tokens.get("total") or meta.get("total_tokens")
    cost = meta.get("total_cost_usd")

    # Summary panel
    summary = Table.grid(padding=(0, 2))
    summary.add_column(style="dim", width=12)
    summary.add_column()

    duration = _elapsed_str(start_dt, end_dt)
    if duration:
        summary.add_row("duration", duration)

    total_step_count = len(all_steps)
    top_steps_str = "  ".join(
        f"{t} ×{n}" for t, n in sorted(type_counts.items(), key=lambda x: -x[1])
    )
    summary.add_row("steps", f"{total_step_count}  [dim]{top_steps_str}[/dim]")

    if total_tokens:
        tok_str = f"{total_tokens:,}"
        inp = tokens.get("input")
        out = tokens.get("output")
        cache_r = tokens.get("cache_read")
        if inp and out:
            tok_str += f"  [dim]in {inp:,} · out {out:,}"
            if cache_r:
                tok_str += f" · cache_read {cache_r:,}"
            tok_str += "[/dim]"
        summary.add_row("tokens", tok_str)

    if cost:
        summary.add_row("cost", f"${cost:.4f}")

    summary.add_row("retries", str(retry_count))
    summary.add_row("errors", f"[red]{error_count}[/red]" if error_count else "0")

    console.print(Panel(summary, title=f"[bold]stats · {trace_id}[/bold]", expand=False))

    # Tool breakdown
    if tool_durations:
        console.print()
        console.print("[bold]tool calls[/bold]")
        tool_table = Table(box=None, padding=(0, 2), header_style="bold dim")
        tool_table.add_column("tool")
        tool_table.add_column("calls", justify="right")
        tool_table.add_column("avg", justify="right")
        tool_table.add_column("total", justify="right")
        tool_table.add_column("min / max", justify="right", style="dim")

        for tool, durations in sorted(tool_durations.items(), key=lambda x: -sum(x[1])):
            count = len(durations)
            avg = sum(durations) / count
            total = sum(durations)
            lo, hi = min(durations), max(durations)
            tool_table.add_row(
                tool,
                str(count),
                _dur_str(avg),
                _dur_str(total),
                f"{_dur_str(lo)} / {_dur_str(hi)}",
            )
        console.print(tool_table)

    # Slowest tool calls
    timed = [s for s in all_steps if s.get("type") == "tool_call" and s.get("duration_ms") is not None]
    timed.sort(key=lambda s: s.get("duration_ms", 0), reverse=True)
    if timed[:3]:
        console.print()
        console.print("[bold]slowest calls[/bold]")
        slow_table = Table(box=None, padding=(0, 2), header_style="bold dim")
        slow_table.add_column("tool")
        slow_table.add_column("duration", justify="right")
        slow_table.add_column("step")
        for s in timed[:3]:
            slow_table.add_row(
                s.get("tool", "?"),
                _dur_str(s.get("duration_ms")),
                s.get("id", "?"),
            )
        console.print(slow_table)


# ─── diff renderer ────────────────────────────────────────────────────────────

def _diff_traces(a: dict, b: dict, file_a: str, file_b: str) -> bool:
    """Returns True if any differences found."""
    console.print(f"\n[dim]{file_a}[/dim]  →  [dim]{file_b}[/dim]\n")

    diffs: List[Tuple[str, str, str]] = []  # (field, old, new)

    # ── header fields ──
    for field in ("status", "id", "goal"):
        va, vb = a.get(field, "—"), b.get(field, "—")
        if va != vb:
            diffs.append((field, str(va), str(vb)))

    # duration
    def _secs(data: dict) -> Optional[float]:
        s = _parse_dt(data.get("started_at"))
        e = _parse_dt(data.get("ended_at"))
        if s and e:
            return (e - s).total_seconds()
        return None

    dur_a, dur_b = _secs(a), _secs(b)
    if dur_a is not None and dur_b is not None and abs(dur_a - dur_b) > 0.1:
        pct = ((dur_b - dur_a) / dur_a * 100) if dur_a else 0
        sign = "+" if pct > 0 else ""
        diffs.append(("duration", f"{dur_a:.1f}s", f"{dur_b:.1f}s  [dim]({sign}{pct:.0f}%)[/dim]"))

    # tokens
    def _total_tokens(data: dict) -> Optional[int]:
        t = data.get("tokens") or {}
        m = data.get("meta") or {}
        return t.get("total") or m.get("total_tokens")

    ta, tb = _total_tokens(a), _total_tokens(b)
    if ta is not None and tb is not None and ta != tb:
        delta = tb - ta
        sign = "+" if delta > 0 else ""
        diffs.append(("tokens", f"{ta:,}", f"{tb:,}  [dim]({sign}{delta:,})[/dim]"))

    # step count
    steps_a = a.get("steps", [])
    steps_b = b.get("steps", [])
    if len(steps_a) != len(steps_b):
        diffs.append(("steps", str(len(steps_a)), str(len(steps_b))))

    has_diff = bool(diffs)

    if diffs:
        hdr_table = Table(box=None, padding=(0, 2), header_style="bold dim")
        hdr_table.add_column("field", style="dim", width=12)
        hdr_table.add_column("before", style="red")
        hdr_table.add_column("after", style="green")
        for field, old, new in diffs:
            hdr_table.add_row(field, old, new)
        console.print(hdr_table)
        console.print()
    else:
        console.print("[dim]header fields unchanged[/dim]\n")

    # ── step-by-step comparison ──
    console.print("[bold]steps[/bold]")
    step_table = Table(box=None, padding=(0, 1), header_style="bold dim")
    step_table.add_column("#", style="dim", width=4)
    step_table.add_column("A", min_width=16)
    step_table.add_column("B", min_width=16)
    step_table.add_column("diff", width=30, style="dim")

    max_steps = max(len(steps_a), len(steps_b))
    for i in range(max_steps):
        sa = steps_a[i] if i < len(steps_a) else None
        sb = steps_b[i] if i < len(steps_b) else None

        if sa is None:
            step_table.add_row(
                str(i + 1),
                Text("—", style="dim"),
                Text(f"{sb.get('type','')} {_truncate(_step_content(sb), 20)}", style="green"),
                "added",
            )
            has_diff = True
        elif sb is None:
            step_table.add_row(
                str(i + 1),
                Text(f"{sa.get('type','')} {_truncate(_step_content(sa), 20)}", style="red"),
                Text("—", style="dim"),
                "removed",
            )
            has_diff = True
        else:
            ta_type = sa.get("type", "")
            tb_type = sb.get("type", "")
            dur_a_ms = sa.get("duration_ms")
            dur_b_ms = sb.get("duration_ms")

            step_diffs = []
            if ta_type != tb_type:
                step_diffs.append(f"type {ta_type}→{tb_type}")
                has_diff = True
            if dur_a_ms is not None and dur_b_ms is not None:
                if abs(dur_a_ms - dur_b_ms) > 50:
                    pct = ((dur_b_ms - dur_a_ms) / dur_a_ms * 100) if dur_a_ms else 0
                    sign = "+" if pct > 0 else ""
                    step_diffs.append(f"dur {_dur_str(dur_a_ms)}→{_dur_str(dur_b_ms)} ({sign}{pct:.0f}%)")
                    has_diff = True
            if ta_type == tb_type and ta_type == "respond":
                ca = sa.get("content", "")
                cb = sb.get("content", "")
                if ca != cb:
                    step_diffs.append(f"content changed ({len(ca)}→{len(cb)} chars)")
                    has_diff = True

            icon_a, style_a = STEP_STYLE.get(ta_type, ("?", "white"))
            icon_b, style_b = STEP_STYLE.get(tb_type, ("?", "white"))
            diff_str = "  ".join(step_diffs) if step_diffs else "[dim]unchanged[/dim]"
            step_table.add_row(
                str(i + 1),
                Text(f"{icon_a} {ta_type}", style=style_a),
                Text(f"{icon_b} {tb_type}", style=style_b),
                diff_str,
            )

    console.print(step_table)
    return has_diff


# ─── CLI commands ─────────────────────────────────────────────────────────────

@click.group()
@click.version_option("0.2.0", prog_name="agentrace")
def main() -> None:
    """AgentTrace CLI — validate, view, diff, and analyse .atrace files."""


@main.command(name="validate")
@click.argument("files", nargs=-1, required=True, type=click.Path())
def validate_cmd(files: Tuple[str, ...]) -> None:
    """Validate one or more .atrace files against the v0.2 schema.

    \b
    Examples:
      agentrace validate run.atrace
      agentrace validate spec/v0.2/examples/*.atrace
    """
    any_invalid = False
    for path in files:
        data = _load(path)
        errors = validate(data)
        if errors is None:
            console.print(f"[green]✓[/green] {path}")
        else:
            any_invalid = True
            n = len(errors)
            console.print(f"[red]✗[/red] {path}  [red]({n} error{'s' if n > 1 else ''})[/red]")
            for e in errors:
                console.print(f"    [dim]{e['path']}[/dim]  {e['message']}")
    sys.exit(1 if any_invalid else 0)


@main.command(name="view")
@click.argument("file", type=click.Path(exists=True))
def view_cmd(file: str) -> None:
    """Show a visual timeline of an agent trace.

    \b
    Examples:
      agentrace view run.atrace
    """
    data = _load(file)
    _view_trace(data)


@main.command(name="stats")
@click.argument("file", type=click.Path(exists=True))
def stats_cmd(file: str) -> None:
    """Print statistics for a trace: duration, step counts, token costs, slowest tools.

    \b
    Examples:
      agentrace stats run.atrace
    """
    data = _load(file)
    _stats_trace(data)


@main.command(name="diff")
@click.argument("file_a", type=click.Path(exists=True))
@click.argument("file_b", type=click.Path(exists=True))
def diff_cmd(file_a: str, file_b: str) -> None:
    """Compare two .atrace files and show what changed.

    \b
    Examples:
      agentrace diff run_v1.atrace run_v2.atrace
    """
    a = _load(file_a)
    b = _load(file_b)
    has_diff = _diff_traces(a, b, file_a, file_b)
    sys.exit(1 if has_diff else 0)
