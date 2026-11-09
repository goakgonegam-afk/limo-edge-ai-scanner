import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "limo_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type SessionPayload = { sub: string; exp: number };

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signSessionToken(
  userId: string,
  secret: string,
  ttlMs: number = SESSION_TTL_MS,
  now: number = Date.now(),
): string {
  const payload: SessionPayload = { sub: userId, exp: now + ttlMs };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifySessionToken(
  token: string | undefined | null,
  secret: string,
  now: number = Date.now(),
): { userId: string } | null {
  if (!token || typeof token !== "string" || !secret) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  const encoded = token.slice(0, separator);
  const provided = token.slice(separator + 1);
  const expected = sign(encoded, secret);
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!payload || typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp <= now) return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}
