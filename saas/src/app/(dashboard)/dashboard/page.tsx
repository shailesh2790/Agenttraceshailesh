import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentTraces } from "@/components/dashboard/RecentTraces";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [total, completed, failed, traces] = await Promise.all([
    prisma.trace.count({ where: { userId } }),
    prisma.trace.count({ where: { userId, status: "completed" } }),
    prisma.trace.count({ where: { userId, status: "failed" } }),
    prisma.trace.findMany({
      where: { userId },
      select: {
        id: true, traceId: true, agentName: true, goal: true, status: true,
        stepsCount: true, startedAt: true, endedAt: true, createdAt: true,
        inputTokens: true, outputTokens: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const totalTokens = await prisma.trace.aggregate({
    where: { userId },
    _sum: { inputTokens: true, outputTokens: true },
  });

  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const totalSteps = await prisma.trace.aggregate({
    where: { userId },
    _sum: { stepsCount: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link
          href="/upload"
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          + Upload trace
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total traces" value={total} icon="◎" />
        <StatCard label="Success rate" value={`${successRate}%`} icon="✓" color="green" />
        <StatCard label="Total steps" value={totalSteps._sum.stepsCount ?? 0} icon="◌" />
        <StatCard
          label="Total tokens"
          value={((totalTokens._sum.inputTokens ?? 0) + (totalTokens._sum.outputTokens ?? 0)).toLocaleString()}
          icon="≋"
          color="blue"
        />
      </div>

      {/* Recent traces */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent traces</h2>
          <Link href="/traces" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            View all →
          </Link>
        </div>
        {traces.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-gray-400 text-sm mb-3">No traces yet.</p>
            <Link href="/upload" className="text-sm text-gray-900 font-medium hover:underline">
              Upload your first trace →
            </Link>
          </div>
        ) : (
          <RecentTraces traces={traces} />
        )}
      </div>
    </div>
  );
}
