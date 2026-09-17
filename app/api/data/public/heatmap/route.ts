import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOwnerAccount } from "@/lib/account";
import { getListeningHeatmap } from "@/lib/aggregate/heatmap";

export async function GET() {
  if (process.env.PUBLIC_DEMO_ENABLED !== "true") {
    return NextResponse.json({ error: "public demo disabled" }, { status: 404 });
  }

  const timeZone = process.env.TIMEZONE ?? "UTC";
  const supabase = supabaseAdmin();
  const account = await getOwnerAccount(supabase);
  if (!account) return NextResponse.json({ days: [] });

  const heatmap = await getListeningHeatmap(supabase, account.id, timeZone);
  return NextResponse.json({ days: heatmap });
}
