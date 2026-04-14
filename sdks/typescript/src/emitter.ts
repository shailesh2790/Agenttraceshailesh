import { randomBytes } from "crypto";
import {
  AgentInfo,
  AgentTrace,
  AnyStep,
  CustomStep,
  ErrorStep,
  HandoffStep,
  LoopIteration,
  LoopStep,
  MemoryOperation,
  MemoryStep,
  RespondStep,
  ResponseFormat,
  ThinkStep,
  TokenCounts,
  ToolCallStep,
} from "./types";

function now(): string {
  return new Date().toISOString();
}

function stepId(): string {
  return `step_${randomBytes(4).toString("hex")}`;
}

function traceId(): string {
  return `trace_${randomBytes(6).toString("hex")}`;
}

export interface EmitterOptions {
  agent: string;
  goal: string;
  model?: string;
  agentVersion?: string;
  input?: string;
  parentTraceId?: string;
  traceId?: string;
  meta?: Record<string, unknown>;
}

export interface PendingToolCall {
  output?: unknown;
  error?: string | null;
}

/**
 * Instrument an agent run and produce an AgentTrace.
 *
 * @example
 * ```ts
 * import { Emitter } from "agentrace";
 *
 * const emitter = new Emitter({ agent: "my-agent", goal: "Find competitors" });
 * emitter.think("I should search first");
 * emitter.toolCall("web_search", { query: "AI agents" }, { output: { results: [] }, durationMs: 1200 });
 * emitter.respond("Here are the results", { format: "markdown", final: true });
 * const trace = emitter.finish();
 * ```
 */
export class Emitter {
  private readonly _agent: AgentInfo;
  private readonly _goal: string;
  private readonly _input?: string;
  private readonly _parentTraceId?: string;
  private readonly _traceId: string;
  private readonly _meta?: Record<string, unknown>;
  private readonly _startedAt: string;
  private readonly _steps: AnyStep[] = [];

  constructor(opts: EmitterOptions) {
    this._agent = {
      name: opts.agent,
      model: opts.model,
      version: opts.agentVersion,
    };
    this._goal = opts.goal;
    this._input = opts.input;
    this._parentTraceId = opts.parentTraceId;
    this._traceId = opts.traceId ?? traceId();
    this._meta = opts.meta;
    this._startedAt = now();
  }

  think(
    reasoning: string,
    opts?: { meta?: Record<string, unknown>; stepId?: string }
  ): ThinkStep {
    const step: ThinkStep = {
      id: opts?.stepId ?? stepId(),
      type: "think",
      started_at: now(),
      reasoning,
      meta: opts?.meta,
    };
    this._steps.push(step);
    return step;
  }

  toolCall(
    tool: string,
    input: Record<string, unknown>,
    opts?: {
      output?: unknown;
      durationMs?: number;
      error?: string | null;
      retryOf?: string;
      meta?: Record<string, unknown>;
      stepId?: string;
    }
  ): ToolCallStep {
    const t = now();
    const step: ToolCallStep = {
      id: opts?.stepId ?? stepId(),
      type: "tool_call",
      started_at: t,
      ended_at: opts?.durationMs != null ? now() : undefined,
      tool,
      input,
      output: opts?.output,
      duration_ms: opts?.durationMs,
      error: opts?.error ?? undefined,
      retry_of: opts?.retryOf,
      meta: opts?.meta,
    };
    this._steps.push(step);
    return step;
  }

  /**
   * Auto-timed tool call using async/await.
   *
   * @example
   * ```ts
   * const result = await emitter.timeToolCall("web_fetch", { url }, async (call) => {
   *   const data = await fetch(url);
   *   call.output = data;
   * });
   * ```
   */
  async timeToolCall(
    tool: string,
    input: Record<string, unknown>,
    fn: (call: PendingToolCall) => Promise<void>,
    opts?: { retryOf?: string; meta?: Record<string, unknown>; stepId?: string }
  ): Promise<ToolCallStep> {
    const sid = opts?.stepId ?? stepId();
    const startedAt = now();
    const t0 = Date.now();
    const pending: PendingToolCall = {};
    let errorMsg: string | null = null;

    try {
      await fn(pending);
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const durationMs = Date.now() - t0;
      const step: ToolCallStep = {
        id: sid,
        type: "tool_call",
        started_at: startedAt,
        ended_at: now(),
        tool,
        input,
        output: pending.output,
        duration_ms: durationMs,
        error: errorMsg ?? pending.error ?? undefined,
        retry_of: opts?.retryOf,
        meta: opts?.meta,
      };
      this._steps.push(step);
      return step;
    }
  }

  respond(
    content: string,
    opts?: {
      format?: ResponseFormat;
      final?: boolean;
      meta?: Record<string, unknown>;
      stepId?: string;
    }
  ): RespondStep {
    const step: RespondStep = {
      id: opts?.stepId ?? stepId(),
      type: "respond",
      started_at: now(),
      content,
      format: opts?.format,
      final: opts?.final,
      meta: opts?.meta,
    };
    this._steps.push(step);
    return step;
  }

  handoff(
    toAgent: string,
    task: string,
    opts?: {
      childTraceId?: string;
      meta?: Record<string, unknown>;
      stepId?: string;
    }
  ): HandoffStep {
    const step: HandoffStep = {
      id: opts?.stepId ?? stepId(),
      type: "handoff",
      started_at: now(),
      to_agent: toAgent,
      task,
      child_trace_id: opts?.childTraceId,
      meta: opts?.meta,
    };
    this._steps.push(step);
    return step;
  }

  error(
    message: string,
    opts?: {
      code?: string;
      recoverable?: boolean;
      meta?: Record<string, unknown>;
      stepId?: string;
    }
  ): ErrorStep {
    const step: ErrorStep = {
      id: opts?.stepId ?? stepId(),
      type: "error",
      started_at: now(),
      message,
      code: opts?.code,
      recoverable: opts?.recoverable,
      meta: opts?.meta,
    };
    this._steps.push(step);
    return step;
  }

  memory(
    operation: MemoryOperation,
    opts?: {
      store?: string;
      key?: string;
      value?: unknown;
      query?: string;
      results?: unknown[];
      durationMs?: number;
      error?: string | null;
      meta?: Record<string, unknown>;
      stepId?: string;
    }
  ): MemoryStep {
    const step: MemoryStep = {
      id: opts?.stepId ?? stepId(),
      type: "memory",
      started_at: now(),
      operation,
      store: opts?.store,
      key: opts?.key,
      value: opts?.value,
      query: opts?.query,
      results: opts?.results,
      duration_ms: opts?.durationMs,
      error: opts?.error ?? undefined,
      meta: opts?.meta,
    };
    this._steps.push(step);
    return step;
  }

  loop(
    iterations: AnyStep[][],
    opts?: {
      label?: string;
      maxIterations?: number;
      exitReason?: string;
      meta?: Record<string, unknown>;
      stepId?: string;
    }
  ): LoopStep {
    const loopIterations: LoopIteration[] = iterations.map((steps, i) => ({
      index: i + 1,
      steps,
    }));
    const step: LoopStep = {
      id: opts?.stepId ?? stepId(),
      type: "loop",
      started_at: now(),
      label: opts?.label,
      max_iterations: opts?.maxIterations,
      exit_reason: opts?.exitReason,
      iterations: loopIterations,
      meta: opts?.meta,
    };
    this._steps.push(step);
    return step;
  }

  custom(
    customType: string,
    opts?: {
      data?: Record<string, unknown>;
      meta?: Record<string, unknown>;
      stepId?: string;
    }
  ): CustomStep {
    const step: CustomStep = {
      id: opts?.stepId ?? stepId(),
      type: "custom",
      started_at: now(),
      custom_type: customType,
      data: opts?.data,
      meta: opts?.meta,
    };
    this._steps.push(step);
    return step;
  }

  finish(
    status: "completed" | "failed" | "cancelled" = "completed",
    opts?: { tokens?: TokenCounts }
  ): AgentTrace {
    return {
      atrace: "0.2.0",
      id: this._traceId,
      agent: this._agent,
      goal: this._goal,
      input: this._input,
      status,
      started_at: this._startedAt,
      ended_at: now(),
      steps: [...this._steps],
      tokens: opts?.tokens,
      parent_trace_id: this._parentTraceId,
      meta: this._meta,
    };
  }

  fail(opts?: { tokens?: TokenCounts }): AgentTrace {
    return this.finish("failed", opts);
  }
}
