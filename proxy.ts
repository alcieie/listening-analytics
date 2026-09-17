import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPrivateApi =
    pathname.startsWith("/api/data/") && !pathname.startsWith("/api/data/public/");
  const isPlaybackApi = pathname.startsWith("/api/playback/");
  const isDashboard = pathname.startsWith("/dashboard");

  if (!isPrivateApi && !isPlaybackApi && !isDashboard) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    if (isDashboard) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/data/:path*", "/api/playback/:path*"],
};
