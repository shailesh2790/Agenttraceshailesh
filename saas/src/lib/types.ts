// AgentTrace v0.2 types — kept in sync with viewer/src/lib/types.ts

export type TraceStatus = "running" | "completed" | "failed" | "cancelled";
export type MemoryOperation = "read" | "write" | "delete" | "search";
export type ResponseFormat = "text" | "markdown" | "json" | "html";

export interface AgentInfo {
  name: string;
  model?: string;
  version?: string;
}

export interface TokenCounts {
  input?: number;
  output?: number;
  cache_read?: number;
  cache_write?: number;
  total?: number;
}

export interface BaseStep {
  id: string;
  type: string;
  started_at: string;
  ended_at?: string;
  retry_of?: string;
  meta?: Record<string, unknown>;
}

export interface ThinkStep extends BaseStep {
  type: "think";
  reasoning: string;
}

export interface ToolCallStep extends BaseStep {
  type: "tool_call";
  tool: string;
  input: Record<string, unknown>;
  output?: unknown;
  duration_ms?: number;
  error?: string | null;
}

export interface RespondStep extends BaseStep {
  type: "respond";
  content: string;
  format?: ResponseFormat;
  final?: boolean;
}

export interface HandoffStep extends BaseStep {
  type: "handoff";
  to_agent: string;
  task: string;
  child_trace_id?: string;
}

export interface ErrorStep extends BaseStep {
  type: "error";
  message: string;
  code?: string;
  recoverable?: boolean;
}

export interface MemoryStep extends BaseStep {
  type: "memory";
  operation: MemoryOperation;
  store?: string;
  key?: string;
  value?: unknown;
  query?: string;
  results?: unknown[];
  duration_ms?: number;
  error?: string | null;
}

export interface LoopIteration {
  index: number;
  steps: AnyStep[];
}

export interface LoopStep extends BaseStep {
  type: "loop";
  label?: string;
  max_iterations?: number;
  exit_reason?: string;
  iterations: LoopIteration[];
}

export interface CustomStep extends BaseStep {
  type: "custom";
  custom_type: string;
  data?: Record<string, unknown>;
}

export type AnyStep =
  | ThinkStep
  | ToolCallStep
  | RespondStep
  | HandoffStep
  | ErrorStep
  | MemoryStep
  | LoopStep
  | CustomStep;

export interface AgentTrace {
  atrace: string;
  id: string;
  agent: AgentInfo;
  goal: string;
  input?: string;
  status: TraceStatus;
  started_at: string;
  ended_at?: string;
  steps: AnyStep[];
  tokens?: TokenCounts;
  parent_trace_id?: string;
  meta?: Record<string, unknown>;
}
