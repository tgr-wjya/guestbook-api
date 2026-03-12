/**
 * Config for app.ts
 *
 * What's in this?
 * @rateLimit
 * @constant MIN_NAME_LENGTH, MIN_TEXT_LENGTH, RATE_LIMIT_MS, CLEANUP_INTERVAL_MS, PORT, HOSTNAME
 * @lastRequestTime
 *
 * @author Tegar Wijaya Kusuma
 * @date 13 March 2026
 */

import { RateLimitError } from './errors/errors';

// USED CONST
export const MIN_NAME_LENGTH = 2;
export const MIN_TEXT_LENGTH = 5;
const RATE_LIMIT_MS = 2000;
const CLEANUP_INTERVAL_MS = RATE_LIMIT_MS * 10;
export const PORT = Number(Bun.env.PORT ?? 3000);
export const HOSTNAME = Bun.env.HOST || '0.0.0.0';

if (!Number.isFinite(PORT)) throw new Error(`Invalid PORT: ${Bun.env.PORT}`);

/**
 * Map() to store IP and the timestamp.
 * setInterval for clearing out unused lastRequestTime to reduce memory-leak.
 */
export const lastRequestTime = new Map<string, number>();
setInterval(() => {
  const cutoff = Date.now() - CLEANUP_INTERVAL_MS;
  for (const [ip, now] of lastRequestTime) {
    if (now < cutoff) lastRequestTime.delete(ip);
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Rate Limit Logic
 *
 * @param set
 * @param request
 */
export function rateLimit(set: { status: number }, request: Request) {
  const ip =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('host')?.split(':')[0] ??
    'unknown';
  const now = Date.now();
  const last = lastRequestTime.get(ip);

  if (last && now - last < RATE_LIMIT_MS) {
    throw new RateLimitError();
  }

  lastRequestTime.set(ip, now);
}
