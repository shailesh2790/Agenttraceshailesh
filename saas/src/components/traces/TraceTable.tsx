import Link from "next/link";
import { StatusBadge } from "@/components/trace/StatusBadge";
import { formatDate, formatElapsed } from "@/lib/format";

interface TraceRow {
  id: string;
  traceId: string;
  agentName: string;
  agentModel: string | null;
  goal: string;
  status: string;
  stepsCount: number;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  inputTokens: number | null;
  outputTokens: number | null;
}

interface Props { traces: TraceRow[] }

export function TraceTable({ traces }: Props) {
  return (
    <div className="divide-y divide-gray-100">
      {traces.map((t) => {
        const tokens = (t.inputTokens ?? 0) + (t.outputTokens ?? 0);
        const elapsed = t.startedAt && t.endedAt
          ? formatElapsed(t.startedAt.toISOString(), t.endedAt.toISOString())
          : null;

        return (
          <Link
            key={t.id}
            href={`/traces/${t.id}`}
            className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
          >
            {/* Left: goal + agent */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="font-mono text-xs text-gray-400 truncate max-w-[180px]">
                  {t.traceId}
                </span>
                <StatusBadge status={t.status} />
              </div>
              <p className="text-sm font-medium text-gray-900 truncate">{t.goal}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {t.agentName}
                {t.agentModel && <span className="text-gray-300"> · {t.agentModel}</span>}
              </p>
            </div>

            {/* Right: stats */}
            <div className="shrink-0 text-right space-y-0.5">
              <div className="text-xs text-gray-500 font-mono">{t.stepsCount} steps</div>
              {elapsed && <div className="text-xs text-gray-400 font-mono">{elapsed}</div>}
              {tokens > 0 && <div className="text-xs text-gray-300 font-mono">{tokens.toLocaleString()} tok</div>}
              <div className="text-xs text-gray-300">{formatDate(t.createdAt)}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
