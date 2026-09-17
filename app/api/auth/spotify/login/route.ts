import { NextResponse } from "next/server";
import { buildAuthorizeUrl, generateCodeChallenge, generateCodeVerifier, generateState } from "@/lib/spotify/oauth";

const TEN_MINUTES = 60 * 10;

export async function GET() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  const response = NextResponse.redirect(buildAuthorizeUrl(state, codeChallenge));

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: TEN_MINUTES,
    path: "/",
  };

  response.cookies.set("spotify_pkce_verifier", codeVerifier, cookieOptions);
  response.cookies.set("spotify_oauth_state", state, cookieOptions);

  return response;
}
