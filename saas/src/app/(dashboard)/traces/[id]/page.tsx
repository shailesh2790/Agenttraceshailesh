import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TraceViewerPage } from "@/components/trace/TraceViewerPage";
import type { AgentTrace } from "@/lib/types";

interface Props {
  params: { id: string };
}

export default async function TracePage({ params }: Props) {
  const session = await auth();
  const userId  = session!.user.id;

  const row = await prisma.trace.findFirst({
    where: { id: params.id, userId },
    select: { raw: true, createdAt: true },
  });

  if (!row) notFound();

  const trace = JSON.parse(row.raw) as AgentTrace;

  return <TraceViewerPage trace={trace} uploadedAt={row.createdAt.toISOString()} />;
}
