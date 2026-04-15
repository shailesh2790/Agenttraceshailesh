"use client";

import { useState } from "react";
import type { AnyStep, LoopStep } from "@/lib/types";
import { formatMs, formatOffset, stepPreview, stepDuration } from "@/lib/format";

const STEP_CONFIG: Record<
  string,
  { icon: string; badge: string; border: string; bg: string }
> = {
  think:     { icon: "◌", badge: "bg-gray-100 text-gray-600",     border: "border-gray-200",    bg: "bg-gray-50"    },
  tool_call: { icon: "⬡", badge: "bg-amber-100 text-amber-700",   border: "border-amber-200",   bg: "bg-amber-50"   },
  respond:   { icon: "◎", badge: "bg-green-100 text-green-700",   border: "border-green-200",   bg: "bg-green-50"   },
  handoff:   { icon: "→", badge: "bg-blue-100 text-blue-700",     border: "border-blue-200",    bg: "bg-blue-50"    },
  error:     { icon: "✗", badge: "bg-red-100 text-red-700",       border: "border-red-300",     bg: "bg-red-50"     },
  memory:    { icon: "◈", badge: "bg-teal-100 text-teal-700",     border: "border-teal-200",    bg: "bg-teal-50"    },
  loop:      { icon: "↻", badge: "bg-indigo-100 text-indigo-700", border: "border-indigo-200",  bg: "bg-indigo-50"  },
  custom:    { icon: "◆", badge: "bg-purple-100 text-purple-700", border: "border-purple-200",  bg: "bg-purple-50"  },
};

const DEFAULT_CONFIG = { icon: "?", badge: "bg-gray-100 text-gray-600", border: "border-gray-200", bg: "bg-gray-50" };

function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-gray-400">null</span>;
  if (typeof value === "string") return <span className="text-green-700">{value}</span>;
  return (
    <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 min-w-0">
      <span className="text-xs text-gray-400 shrink-0 w-20 pt-0.5">{label}</span>
      <div className="text-xs font-mono text-gray-700 flex-1 min-w-0 break-words">{children}</div>
    </div>
  );
}

function StepDetail({ step }: { step: AnyStep }) {
  return (
    <div className="mt-2 ml-8 space-y-2 p-3 rounded-lg bg-white border border-gray-200 text-sm">
      <DetailRow label="step id">{step.id}</DetailRow>
      <DetailRow label="started">{step.started_at}</DetailRow>
      {step.ended_at && <DetailRow label="ended">{step.ended_at}</DetailRow>}
      {step.retry_of && <DetailRow label="retry of">{step.retry_of}</DetailRow>}

      {step.type === "think" && (
        <DetailRow label="reasoning">
          <span className="whitespace-pre-wrap font-sans">{step.reasoning}</span>
        </DetailRow>
      )}

      {step.type === "tool_call" && (
        <>
          <DetailRow label="tool">{step.tool}</DetailRow>
          <DetailRow label="input"><JsonBlock value={step.input} /></DetailRow>
          {step.output !== undefined && <DetailRow label="output"><JsonBlock value={step.output} /></DetailRow>}
          {step.duration_ms != null && <DetailRow label="duration">{formatMs(step.duration_ms)}</DetailRow>}
          {step.error && <DetailRow label="error"><span className="text-red-600">{step.error}</span></DetailRow>}
        </>
      )}

      {step.type === "respond" && (
        <>
          {step.format && <DetailRow label="format">{step.format}</DetailRow>}
          <DetailRow label="content">
            <span className="whitespace-pre-wrap font-sans">{step.content}</span>
          </DetailRow>
        </>
      )}

      {step.type === "handoff" && (
        <>
          <DetailRow label="to agent">{step.to_agent}</DetailRow>
          <DetailRow label="task"><span className="font-sans">{step.task}</span></DetailRow>
          {step.child_trace_id && <DetailRow label="child trace">{step.child_trace_id}</DetailRow>}
        </>
      )}

      {step.type === "error" && (
        <>
          <DetailRow label="message"><span className="text-red-700 font-sans">{step.message}</span></DetailRow>
          {step.code && <DetailRow label="code">{step.code}</DetailRow>}
          {step.recoverable != null && <DetailRow label="recoverable">{String(step.recoverable)}</DetailRow>}
        </>
      )}

      {step.type === "memory" && (
        <>
          <DetailRow label="operation">{step.operation}</DetailRow>
          {step.store && <DetailRow label="store">{step.store}</DetailRow>}
          {step.key && <DetailRow label="key">{step.key}</DetailRow>}
          {step.query && <DetailRow label="query"><span className="font-sans">{step.query}</span></DetailRow>}
          {step.value !== undefined && <DetailRow label="value"><JsonBlock value={step.value} /></DetailRow>}
          {step.results && <DetailRow label="results"><JsonBlock value={step.results} /></DetailRow>}
          {step.duration_ms != null && <DetailRow label="duration">{formatMs(step.duration_ms)}</DetailRow>}
          {step.error && <DetailRow label="error"><span className="text-red-600">{step.error}</span></DetailRow>}
        </>
      )}

      {step.type === "custom" && (
        <>
          <DetailRow label="custom type">{step.custom_type}</DetailRow>
          {step.data && <DetailRow label="data"><JsonBlock value={step.data} /></DetailRow>}
        </>
      )}

      {step.meta && Object.keys(step.meta).length > 0 && (
        <DetailRow label="meta"><JsonBlock value={step.meta} /></DetailRow>
      )}
    </div>
  );
}

interface StepItemProps {
  step: AnyStep;
  traceStart: string;
  index: number | string;
  depth?: number;
}

export function StepItem({ step, traceStart, index, depth = 0 }: StepItemProps) {
  const [open, setOpen]         = useState(false);
  const [loopsOpen, setLoopsOpen] = useState(true);

  const cfg      = STEP_CONFIG[step.type] ?? DEFAULT_CONFIG;
  const offset   = formatOffset(traceStart, step.started_at);
  const preview  = stepPreview(step);
  const duration = stepDuration(step);
  const isLoop   = step.type === "loop";

  return (
    <div className={depth > 0 ? "ml-4" : ""}>
      <div
        className={`flex items-start gap-2.5 py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors group ${isLoop ? "cursor-default" : ""}`}
        onClick={() => !isLoop && setOpen(!open)}
      >
        <span className="text-xs text-gray-300 font-mono w-6 shrink-0 text-right pt-0.5 group-hover:text-gray-400 transition-colors">
          {index}
        </span>
        <span className={`text-xs font-mono px-2 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
          {cfg.icon} {step.type}
        </span>
        <span className="text-xs text-gray-300 shrink-0 w-14 text-right pt-0.5 font-mono">
          {offset}
        </span>
        <span className="text-sm text-gray-600 flex-1 truncate pt-0.5 min-w-0">
          {preview}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {duration != null && (
            <span className="text-xs text-gray-400 font-mono">{formatMs(duration)}</span>
          )}
          {step.type === "tool_call" && step.error && (
            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">error</span>
          )}
          {step.type === "respond" && step.final && (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">final</span>
          )}
          {step.retry_of && (
            <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">retry</span>
          )}
          {isLoop ? (
            <button
              onClick={(e) => { e.stopPropagation(); setLoopsOpen(!loopsOpen); }}
              className="text-xs text-gray-400 hover:text-gray-700 ml-1"
            >
              {loopsOpen ? "▲" : "▼"}
            </button>
          ) : (
            <span className="text-xs text-gray-300 ml-1">{open ? "▲" : "▼"}</span>
          )}
        </div>
      </div>

      {!isLoop && open && <StepDetail step={step} />}

      {isLoop && loopsOpen && (
        <div className="ml-8 mt-1 mb-2">
          {(step as LoopStep).iterations.map((iter) => (
            <div key={iter.index} className="mb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400 shrink-0">Iteration {iter.index}</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="space-y-0.5">
                {iter.steps.map((s, j) => (
                  <StepItem
                    key={s.id}
                    step={s}
                    traceStart={traceStart}
                    index={`${index}.${iter.index}.${j + 1}`}
                    depth={depth + 1}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
