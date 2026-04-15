import type { AgentTrace, AnyStep } from "./types";

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

export function formatElapsed(start?: string, end?: string): string {
  if (!start || !end) return "";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return formatMs(ms);
}

export function formatOffset(traceStart: string, stepStart?: string): string {
  if (!stepStart) return "";
  const ms = new Date(stepStart).getTime() - new Date(traceStart).getTime();
  if (ms < 0) return "+0.0s";
  if (ms < 60_000) return `+${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `+${m}m${s}s`;
}

export function truncate(s: string, n: number): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length <= n ? flat : flat.slice(0, n - 1) + "…";
}

export function stepPreview(step: AnyStep): string {
  switch (step.type) {
    case "think":
      return truncate(step.reasoning, 90);
    case "tool_call": {
      const inp = JSON.stringify(step.input);
      return `${step.tool} › ${truncate(inp, 60)}`;
    }
    case "respond":
      return truncate(step.content, 90);
    case "handoff":
      return `→ ${step.to_agent} · ${truncate(step.task, 60)}`;
    case "error":
      return truncate(step.message, 90);
    case "memory": {
      const parts = [step.operation, step.store, step.key ?? step.query].filter(Boolean);
      return parts.join(" / ");
    }
    case "loop": {
      const n = step.iterations.length;
      const label = step.label ? `${step.label}  ` : "";
      return `${label}${n} iteration${n !== 1 ? "s" : ""}`;
    }
    case "custom":
      return step.custom_type;
    default:
      return "";
  }
}

export function stepDuration(step: AnyStep): number | null {
  if (step.type === "tool_call") return step.duration_ms ?? null;
  if (step.type === "memory") return step.duration_ms ?? null;
  if (step.type === "loop" && step.started_at && step.ended_at) {
    return new Date(step.ended_at).getTime() - new Date(step.started_at).getTime();
  }
  return null;
}

export function traceTokenSummary(trace: AgentTrace): string {
  const t = trace.tokens;
  const m = trace.meta as Record<string, unknown> | undefined;
  const total = t?.total ?? (m?.total_tokens as number | undefined);
  if (!total) return "";
  let s = `${total.toLocaleString()} tokens`;
  if (t?.input && t?.output) {
    s += `  ·  in ${t.input.toLocaleString()} / out ${t.output.toLocaleString()}`;
  }
  return s;
}

export function traceElapsed(trace: AgentTrace): string {
  return formatElapsed(trace.started_at, trace.ended_at);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
