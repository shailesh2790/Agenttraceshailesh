import Link from "next/link";
import { StatusBadge } from "@/components/trace/StatusBadge";
import { formatDate, formatElapsed } from "@/lib/format";

interface TraceRow {
  id: string;
  traceId: string;
  agentName: string;
  goal: string;
  status: string;
  stepsCount: number;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
}

interface Props { traces: TraceRow[] }

export function RecentTraces({ traces }: Props) {
  return (
    <div className="divide-y divide-gray-100">
      {traces.map((t) => (
        <Link
          key={t.id}
          href={`/traces/${t.id}`}
          className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-xs text-gray-400 truncate">{t.traceId}</span>
              <StatusBadge status={t.status} />
            </div>
            <p className="text-sm font-medium text-gray-900 truncate">{t.goal}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t.agentName}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-gray-500 font-mono">{t.stepsCount} steps</div>
            {t.startedAt && t.endedAt && (
              <div className="text-xs text-gray-400 font-mono">
                {formatElapsed(t.startedAt.toISOString(), t.endedAt.toISOString())}
              </div>
            )}
            <div className="text-xs text-gray-400 mt-0.5">{formatDate(t.createdAt)}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
