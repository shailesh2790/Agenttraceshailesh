import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Run on Node.js runtime so bcryptjs and crypto work
export const runtime = "nodejs";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/traces/:path*",
    "/upload/:path*",
    "/keys/:path*",
    "/projects/:path*",
    "/api/traces/:path*",
    "/api/keys/:path*",
  ],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── API routes: Bearer API key path ──────────────────────────────────────
  // Actual bcrypt verification happens in the route handler via x-agentrace-auth header.
  // Middleware only passes the key along; the route handler verifies and rejects if invalid.
  if (pathname.startsWith("/api/")) {
    const authHeader = req.headers.get("authorization") ?? "";
    if (authHeader.startsWith("Bearer at_")) {
      // Delegate full verification to the route handler (avoids Node.js bcrypt in Edge)
      const headers = new Headers(req.headers);
      headers.set("x-agentrace-apikey", authHeader.slice(7));
      return NextResponse.next({ request: { headers } });
    }
  }

  // ── Session check for all protected routes ────────────────────────────────
  const session = await auth();
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
