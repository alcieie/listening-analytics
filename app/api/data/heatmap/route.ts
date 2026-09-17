import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getListeningHeatmap } from "@/lib/aggregate/heatmap";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const timeZone = process.env.TIMEZONE ?? "UTC";
  const supabase = supabaseAdmin();
  const heatmap = await getListeningHeatmap(supabase, session.spotifyAccountId, timeZone);
  return NextResponse.json({ days: heatmap });
}
