import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/spotify/oauth";
import { getMe } from "@/lib/spotify/api";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const cookieVerifier = request.cookies.get("spotify_pkce_verifier")?.value;
  const cookieState = request.cookies.get("spotify_oauth_state")?.value;

  const fail = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, request.url));
    response.cookies.delete("spotify_pkce_verifier");
    response.cookies.delete("spotify_oauth_state");
    return response;
  };

  if (errorParam) return fail(errorParam);
  if (!code || !state || !cookieVerifier || !cookieState) return fail("missing_oauth_params");
  if (state !== cookieState) return fail("state_mismatch");

  try {
    const tokens = await exchangeCodeForTokens(code, cookieVerifier);
    const me = await getMe(tokens.access_token);

    const supabase = supabaseAdmin();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { data: account, error } = await supabase
      .from("spotify_accounts")
      .upsert(
        {
          spotify_user_id: me.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "spotify_user_id" }
      )
      .select("id")
      .single();

    if (error || !account) {
      throw new Error(error?.message ?? "Failed to upsert spotify_accounts row");
    }

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.delete("spotify_pkce_verifier");
    response.cookies.delete("spotify_oauth_state");
    response.cookies.set(SESSION_COOKIE, await createSessionToken(account.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("Spotify OAuth callback failed", err);
    return fail("token_exchange_failed");
  }
}
