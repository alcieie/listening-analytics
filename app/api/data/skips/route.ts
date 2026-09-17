import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSkipStats } from "@/lib/aggregate/skips";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const stats = await getSkipStats(supabase, session.spotifyAccountId);
  return NextResponse.json(stats);
}
