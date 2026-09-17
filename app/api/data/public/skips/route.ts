import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOwnerAccount } from "@/lib/account";
import { getSkipStats } from "@/lib/aggregate/skips";

export async function GET() {
  if (process.env.PUBLIC_DEMO_ENABLED !== "true") {
    return NextResponse.json({ error: "public demo disabled" }, { status: 404 });
  }

  const supabase = supabaseAdmin();
  const account = await getOwnerAccount(supabase);
  if (!account) return NextResponse.json({ byArtist: [], byGenre: [] });

  const stats = await getSkipStats(supabase, account.id);
  return NextResponse.json(stats);
}
