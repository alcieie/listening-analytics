import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const SPOTIFY_SCOPES = [
  "user-read-recently-played",
  "user-read-playback-state",
  "user-read-currently-playing",
  "streaming",
  "user-modify-playback-state",
  "user-read-email",
  "user-read-private",
].join(" ");

const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set (see .env.example)`);
  return value;
}

export function generateCodeVerifier(): string {
  return crypto.randomBytes(64).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function generateState(): string {
  return crypto.randomBytes(16).toString("base64url");
}

export function buildAuthorizeUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: requireEnv("SPOTIFY_CLIENT_ID"),
    scope: SPOTIFY_SCOPES,
    redirect_uri: requireEnv("SPOTIFY_REDIRECT_URI"),
    state,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: requireEnv("SPOTIFY_REDIRECT_URI"),
    client_id: requireEnv("SPOTIFY_CLIENT_ID"),
    code_verifier: codeVerifier,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`Spotify token exchange failed: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<TokenResponse>;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: requireEnv("SPOTIFY_CLIENT_ID"),
  });

  // Spotify's refresh endpoint accepts either client-secret-in-body (PKCE
  // apps) — client_secret is omitted here since this app registers as a
  // public PKCE client. If Spotify's dashboard requires a confidential
  // client for your app type, add client_secret via Basic auth instead.
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`Spotify token refresh failed: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<TokenResponse>;
}

export type SpotifyAccountRow = {
  id: string;
  spotify_user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO timestamp
};

const EXPIRY_SAFETY_MARGIN_MS = 60_000;

/**
 * Returns a valid access token for this account, transparently refreshing
 * and persisting the new token pair if the current one is near expiry.
 * Shared by the cron poller and the playback-token route so both always
 * see the same refreshed token.
 */
export async function getValidAccessToken(
  supabase: SupabaseClient,
  account: SpotifyAccountRow
): Promise<string> {
  const expiresAt = new Date(account.expires_at).getTime();
  if (expiresAt - Date.now() > EXPIRY_SAFETY_MARGIN_MS) {
    return account.access_token;
  }

  const tokens = await refreshAccessToken(account.refresh_token);
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error } = await supabase
    .from("spotify_accounts")
    .update({
      access_token: tokens.access_token,
      // Spotify doesn't always rotate the refresh token; keep the old one if absent.
      refresh_token: tokens.refresh_token ?? account.refresh_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id);

  if (error) {
    throw new Error(`Failed to persist refreshed Spotify token: ${error.message}`);
  }

  return tokens.access_token;
}
