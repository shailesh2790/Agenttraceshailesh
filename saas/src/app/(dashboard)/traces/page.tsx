import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TraceTable } from "@/components/traces/TraceTable";
import { TraceFilters } from "@/components/traces/TraceFilters";
import Link from "next/link";

interface Props {
  searchParams: { status?: string; agent?: string; page?: string };
}

export default async function TracesPage({ searchParams }: Props) {
  const session = await auth();
  const userId = session!.user.id;

  const page   = Math.max(1, Number(searchParams.page ?? 1));
  const limit  = 20;
  const offset = (page - 1) * limit;
  const status = searchParams.status;
  const agent  = searchParams.agent;

  const [traces, total] = await Promise.all([
    prisma.trace.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
        ...(agent  ? { agentName: { contains: agent } } : {}),
      },
      select: {
        id: true, traceId: true, agentName: true, agentModel: true, goal: true,
        status: true, stepsCount: true, startedAt: true, endedAt: true,
        createdAt: true, inputTokens: true, outputTokens: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.trace.count({
      where: {
        userId,
        ...(status ? { status } : {}),
        ...(agent  ? { agentName: { contains: agent } } : {}),
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Traces</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
        <Link
          href="/upload"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          + Upload trace
        </Link>
      </div>

      <TraceFilters status={status} agent={agent} />

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mt-4">
        {traces.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            No traces found.{" "}
            <Link href="/upload" className="text-gray-900 font-medium hover:underline">
              Upload one →
            </Link>
          </div>
        ) : (
          <TraceTable traces={traces} />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/traces?page=${p}${status ? `&status=${status}` : ""}${agent ? `&agent=${agent}` : ""}`}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
