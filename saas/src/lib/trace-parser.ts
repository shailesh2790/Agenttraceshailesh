/**
 * Extracts indexed DB fields from a raw AgentTrace JSON object.
 * Call this once on upload; the result feeds prisma.trace.create().
 */

interface TraceFields {
  traceId: string;
  agentName: string;
  agentModel: string | null;
  goal: string;
  status: string;
  stepsCount: number;
  inputTokens: number | null;
  outputTokens: number | null;
  startedAt: Date | null;
  endedAt: Date | null;
}

export function parseTrace(raw: unknown): TraceFields {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = raw as any;

  if (!t || typeof t !== "object") {
    throw new Error("Invalid trace: not an object");
  }
  if (!t.id || !t.agent?.name || !t.goal || !t.status || !Array.isArray(t.steps)) {
    throw new Error(
      "Invalid trace: missing required fields (id, agent.name, goal, status, steps)"
    );
  }

  return {
    traceId: String(t.id),
    agentName: String(t.agent.name),
    agentModel: t.agent.model ? String(t.agent.model) : null,
    goal: String(t.goal),
    status: String(t.status),
    stepsCount: t.steps.length,
    inputTokens: t.tokens?.input != null ? Number(t.tokens.input) : null,
    outputTokens: t.tokens?.output != null ? Number(t.tokens.output) : null,
    startedAt: t.started_at ? new Date(t.started_at) : null,
    endedAt: t.ended_at ? new Date(t.ended_at) : null,
  };
}
