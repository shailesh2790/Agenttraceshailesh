import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseTrace } from "@/lib/trace-parser";
import { verifyApiKey } from "@/lib/api-key";

async function getUserId(req: NextRequest): Promise<string | null> {
  // API key path — key was forwarded by middleware, verify here
  const rawKey = req.headers.get("x-agentrace-apikey");
  if (rawKey) {
    return verifyApiKey(rawKey);
  }
  // Session path
  const session = await auth();
  return session?.user?.id ?? null;
}

// GET /api/traces — list traces for current user
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status  = searchParams.get("status") ?? undefined;
  const agent   = searchParams.get("agent")  ?? undefined;
  const project = searchParams.get("project") ?? undefined;
  const limit   = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
  const offset  = Number(searchParams.get("offset") ?? "0");

  const traces = await prisma.trace.findMany({
    where: {
      userId,
      ...(status  ? { status }              : {}),
      ...(agent   ? { agentName: { contains: agent } } : {}),
      ...(project ? { projectId: project }  : {}),
    },
    select: {
      id: true,
      traceId: true,
      agentName: true,
      agentModel: true,
      goal: true,
      status: true,
      stepsCount: true,
      inputTokens: true,
      outputTokens: true,
      startedAt: true,
      endedAt: true,
      projectId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  const total = await prisma.trace.count({ where: { userId } });

  return NextResponse.json({ traces, total, limit, offset });
}

// POST /api/traces — upload a new trace
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let raw: unknown;
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Missing file field" }, { status: 400 });
    }
    const text = await (file as File).text();
    try { raw = JSON.parse(text); }
    catch { return NextResponse.json({ error: "Invalid JSON in file" }, { status: 400 }); }
  } else {
    try { raw = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  }

  let fields;
  try {
    fields = parseTrace(raw);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message ?? "Invalid trace format" },
      { status: 422 }
    );
  }

  const projectId = (raw as Record<string, unknown>).projectId as string | undefined;

  const trace = await prisma.trace.create({
    data: {
      userId,
      projectId: projectId ?? null,
      raw: JSON.stringify(raw),
      ...fields,
    },
  });

  return NextResponse.json({ id: trace.id, traceId: trace.traceId }, { status: 201 });
}
