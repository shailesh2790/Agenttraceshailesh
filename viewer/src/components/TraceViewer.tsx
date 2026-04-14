"use client";

import type { AgentTrace } from "@/lib/types";
import { StepItem } from "./StepItem";
import { traceElapsed, traceTokenSummary } from "@/lib/format";

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  completed: { label: "✓ completed", classes: "bg-green-100 text-green-700" },
  failed:    { label: "✗ failed",    classes: "bg-red-100 text-red-700"     },
  running:   { label: "⋯ running",   classes: "bg-yellow-100 text-yellow-700" },
  cancelled: { label: "⊘ cancelled", classes: "bg-gray-100 text-gray-600"   },
};

interface Props {
  trace: AgentTrace;
  onReset: () => void;
}

export function TraceViewer({ trace, onReset }: Props) {
  const status = STATUS_CONFIG[trace.status] ?? { label: trace.status, classes: "bg-gray-100 text-gray-600" };
  const elapsed = traceElapsed(trace);
  const tokenSummary = traceTokenSummary(trace);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <span className="font-semibold text-gray-900 tracking-tight">AgentTrace</span>
        <button
          onClick={onReset}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← Load another trace
        </button>
      </nav>

      <div className="max-w-4xl mx-auto w-full px-6 py-8 flex-1">
        {/* Header card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="font-mono text-sm font-medium text-gray-900">{trace.id}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.classes}`}>
                  {status.label}
                </span>
                {trace.atrace && (
                  <span className="text-xs text-gray-400 font-mono">atrace v{trace.atrace}</span>
                )}
              </div>

              <div className="text-sm text-gray-500 mb-2">
                <span className="font-medium text-gray-700">{trace.agent.name}</span>
                {trace.agent.version && (
                  <span className="text-gray-400"> v{trace.agent.version}</span>
                )}
                {trace.agent.model && (
                  <span className="text-gray-400"> · {trace.agent.model}</span>
                )}
              </div>

              <p className="text-sm text-gray-700 font-medium mb-1">{trace.goal}</p>
              {trace.input && trace.input !== trace.goal && (
                <p className="text-xs text-gray-400 italic">&ldquo;{trace.input}&rdquo;</p>
              )}
            </div>

            {/* Stats pills */}
            <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
              {elapsed && (
                <span className="text-xs text-gray-500 font-mono">{elapsed}</span>
              )}
              {tokenSummary && (
                <span className="text-xs text-gray-400 font-mono">{tokenSummary}</span>
              )}
              {trace.steps.length > 0 && (
                <span className="text-xs text-gray-400">
                  {trace.steps.length} step{trace.steps.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Steps */}
        {trace.steps.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-16">No steps recorded</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-2 py-2 space-y-0.5">
              {trace.steps.map((step, i) => (
                <StepItem
                  key={step.id}
                  step={step}
                  traceStart={trace.started_at}
                  index={i + 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-300">
            <a
              href="https://github.com/shailesh2790/Agenttraceshailesh"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-500 transition-colors"
            >
              AgentTrace open standard
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
