import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/api-key";

async function getUserId(req: NextRequest): Promise<string | null> {
  const rawKey = req.headers.get("x-agentrace-apikey");
  if (rawKey) return verifyApiKey(rawKey);
  const session = await auth();
  return session?.user?.id ?? null;
}

// GET /api/traces/[id] — return full trace JSON
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trace = await prisma.trace.findFirst({
    where: { id: params.id, userId },
  });
  if (!trace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: trace.id,
    createdAt: trace.createdAt,
    raw: JSON.parse(trace.raw),
  });
}

// DELETE /api/traces/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trace = await prisma.trace.findFirst({ where: { id: params.id, userId } });
  if (!trace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.trace.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
