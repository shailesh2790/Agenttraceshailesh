import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

/** Generate a new API key string: at_<56 hex chars> */
export function generateRawKey(): string {
  return "at_" + randomBytes(28).toString("hex");
}

/** Extract the display prefix (8 chars after "at_") */
export function keyPrefix(raw: string): string {
  return raw.slice(3, 11);
}

/** Hash a raw key for storage */
export async function hashKey(raw: string): Promise<string> {
  return bcrypt.hash(raw, 10);
}

/**
 * Verify an incoming API key against stored hashes.
 * Returns the userId if valid, null otherwise.
 * Also updates lastUsedAt on the matched key.
 */
export async function verifyApiKey(raw: string): Promise<string | null> {
  if (!raw.startsWith("at_")) return null;

  const prefix = keyPrefix(raw);
  const keys = await prisma.apiKey.findMany({
    where: { keyPrefix: prefix },
    select: { id: true, userId: true, keyHash: true },
  });

  for (const k of keys) {
    const match = await bcrypt.compare(raw, k.keyHash);
    if (match) {
      // Fire-and-forget — don't block response on this
      prisma.apiKey
        .update({ where: { id: k.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});
      return k.userId;
    }
  }

  return null;
}
