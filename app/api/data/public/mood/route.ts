import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOwnerAccount } from "@/lib/account";
import { getMoodTrend } from "@/lib/aggregate/mood";

/**
 * Public, read-only, no auth: powers the /demo page. Returns only
 * aggregate hour/week buckets for the site owner's single account — never
 * raw per-play timestamps, track identifiers, or tokens.
 */
export async function GET() {
  if (process.env.PUBLIC_DEMO_ENABLED !== "true") {
    return NextResponse.json({ error: "public demo disabled" }, { status: 404 });
  }

  const timeZone = process.env.TIMEZONE ?? "UTC";
  const supabase = supabaseAdmin();
  const account = await getOwnerAccount(supabase);
  if (!account) return NextResponse.json({ byHour: [], byWeek: [] });

  const trend = await getMoodTrend(supabase, account.id, timeZone);
  return NextResponse.json(trend);
}
