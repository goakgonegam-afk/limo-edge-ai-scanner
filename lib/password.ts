import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(
  password: string,
  salt: string = randomBytes(16).toString("hex"),
): { hash: string; salt: string } {
  const hash = scryptSync(password.normalize("NFKC"), salt, KEY_LENGTH).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const candidate = scryptSync(password.normalize("NFKC"), salt, KEY_LENGTH);
    const expected = Buffer.from(hash, "hex");
    if (candidate.length !== expected.length) return false;
    return timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}
