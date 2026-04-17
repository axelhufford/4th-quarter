import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Constant-time verification of the cron shared secret.
 *
 * - Returns false if CRON_SECRET is unset/empty (fail-closed).
 * - Returns false if no header is provided.
 * - Uses timingSafeEqual with a length check so byte-by-byte comparisons
 *   don't leak timing information about the secret.
 */
export function verifyCronSecret(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const provided =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  if (!provided) return false;

  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");

  // timingSafeEqual requires equal lengths; length-mismatch is an immediate
  // fail (length leaks, but that's an acceptable tradeoff vs. throwing).
  if (expectedBuf.length !== providedBuf.length) return false;

  return timingSafeEqual(expectedBuf, providedBuf);
}
