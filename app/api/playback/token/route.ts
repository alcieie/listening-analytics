import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOwnerAccountById } from "@/lib/account";
import { getValidAccessToken } from "@/lib/spotify/oauth";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/**
 * The only route that ever sends a Spotify access token to the browser.
 * Gated by the owner-session cookie (also enforced by middleware). Used
 * solely to initialize the Web Playback SDK.
 */
export async function GET(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = supabaseAdmin();
  const account = await getOwnerAccountById(supabase, session.spotifyAccountId);
  if (!account) return NextResponse.json({ error: "no spotify account" }, { status: 404 });

  const accessToken = await getValidAccessToken(supabase, account);
  return NextResponse.json({ accessToken });
}
