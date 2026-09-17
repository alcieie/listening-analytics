/**
 * Single-owner-per-deployment session: a signed (HMAC-SHA256), not encrypted,
 * cookie payload naming the spotify_accounts row this browser is allowed to
 * act as. There's no multi-tenant concept here by design (see plan).
 *
 * Uses Web Crypto (not Node's `crypto` module) so this works identically in
 * the Edge runtime (middleware), server components, and route handlers.
 */

export const SESSION_COOKIE = "owner_session";

export type SessionPayload = {
  spotifyAccountId: string;
  issuedAt: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET must be set (see .env.example)");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(spotifyAccountId: string): Promise<string> {
  const payload: SessionPayload = { spotifyAccountId, issuedAt: Date.now() };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));

  const key = await getKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));

  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  try {
    const key = await getKey();
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature) as BufferSource,
      encoder.encode(body)
    );
    if (!isValid) return null;

    return JSON.parse(decoder.decode(fromBase64Url(body))) as SessionPayload;
  } catch {
    return null;
  }
}
