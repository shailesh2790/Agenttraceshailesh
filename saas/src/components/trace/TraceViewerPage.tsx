"use client";

import Link from "next/link";
import type { AgentTrace } from "@/lib/types";
import { StepItem } from "./StepItem";
import { StatusBadge } from "./StatusBadge";
import { traceElapsed, traceTokenSummary, formatDate } from "@/lib/format";

interface Props {
  trace: AgentTrace;
  uploadedAt: string;
}

export function TraceViewerPage({ trace, uploadedAt }: Props) {
  const elapsed      = traceElapsed(trace);
  const tokenSummary = traceTokenSummary(trace);

  return (
    <div>
      {/* Back link */}
      <Link href="/traces" className="text-sm text-gray-400 hover:text-gray-900 transition-colors mb-6 inline-block">
        ← Back to traces
      </Link>

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="font-mono text-sm font-medium text-gray-900">{trace.id}</h1>
              <StatusBadge status={trace.status} />
              {trace.atrace && (
                <span className="text-xs text-gray-400 font-mono">atrace v{trace.atrace}</span>
              )}
            </div>
            <div className="text-sm text-gray-500 mb-2">
              <span className="font-medium text-gray-700">{trace.agent.name}</span>
              {trace.agent.version && <span className="text-gray-400"> v{trace.agent.version}</span>}
              {trace.agent.model && <span className="text-gray-400"> · {trace.agent.model}</span>}
            </div>
            <p className="text-sm text-gray-700 font-medium mb-1">{trace.goal}</p>
            {trace.input && trace.input !== trace.goal && (
              <p className="text-xs text-gray-400 italic">&ldquo;{trace.input}&rdquo;</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
            {elapsed && <span className="text-xs text-gray-500 font-mono">{elapsed}</span>}
            {tokenSummary && <span className="text-xs text-gray-400 font-mono">{tokenSummary}</span>}
            {trace.steps.length > 0 && (
              <span className="text-xs text-gray-400">
                {trace.steps.length} step{trace.steps.length !== 1 ? "s" : ""}
              </span>
            )}
            <span className="text-xs text-gray-300">uploaded {formatDate(uploadedAt)}</span>
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
    </div>
  );
}
