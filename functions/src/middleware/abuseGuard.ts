import type { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { createHash } from 'node:crypto';
interface AuthenticatedRequest extends Request {
  apiToken?: {
    owner: string;
    token: string;
    note?: string;
    permissions?: string[];
  };
}
type RateLimitEventType = 'near-threshold' | 'threshold-exceeded' | 'blocked';
interface CacheEntry {
  count: number;
  expiresAt: number;
  warned: boolean;
  breached: boolean;
  blockUntil?: number;
  lastWarnedAt?: number;
  lastBlockedAt?: number;
}
interface BreachHistoryEntry {
  consecutiveBreaches: number;
  lastBreachAt: number;
}
const WINDOW_MS = clampNumber(
  Number.parseInt(process.env.ABUSE_GUARD_WINDOW_MS ?? '', 10),
  1_000,
  60_000,
  10_000
);
const THRESHOLD = clampNumber(
  Number.parseInt(process.env.ABUSE_GUARD_THRESHOLD ?? '', 10),
  20,
  2_000,
  150
);
const WARN_RATIO = clampNumber(
  Number.parseFloat(process.env.ABUSE_GUARD_WARN_RATIO ?? ''),
  0.1,
  1,
  0.8
);
const BREACH_LIMIT = clampNumber(
  Number.parseInt(process.env.ABUSE_GUARD_BREACH_LIMIT ?? '', 10),
  1,
  5,
  2
);
const HISTORY_RESET_MS =
  Number.isNaN(Number.parseInt(process.env.ABUSE_GUARD_HISTORY_RESET_MS ?? '', 10)) ||
  Number.parseInt(process.env.ABUSE_GUARD_HISTORY_RESET_MS ?? '', 10) < WINDOW_MS
    ? WINDOW_MS * 6
    : Number.parseInt(process.env.ABUSE_GUARD_HISTORY_RESET_MS ?? '', 10);
const PROTECTED_METHODS = (process.env.ABUSE_GUARD_METHODS ?? 'POST,PUT,PATCH,DELETE')
  .split(',')
  .map((method) => method.trim().toUpperCase())
  .filter(Boolean);
const PATH_PREFIXES = (process.env.ABUSE_GUARD_PATH_PREFIXES ?? '/api/progress,/api/team')
  .split(',')
  .map((prefix) => prefix.trim())
  .filter(Boolean);
const EVENT_COLLECTION = process.env.ABUSE_GUARD_COLLECTION ?? 'rateLimitEvents';
const hitCache = new Map<string, CacheEntry>();
const breachHistory = new Map<string, BreachHistoryEntry>();
export function abuseGuard(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!shouldGuard(req)) {
    next();
    return;
  }
  const key = resolveCacheKey(req);
  if (!key) {
    next();
    return;
  }
  const now = Date.now();
  let entry = hitCache.get(key);
  if (!entry || entry.expiresAt <= now) {
    const persistedBlock =
      entry?.blockUntil && entry.blockUntil > now ? entry.blockUntil : undefined;
    entry = {
      count: 0,
      expiresAt: now + WINDOW_MS,
      warned: false,
      breached: false,
      blockUntil: persistedBlock,
      lastWarnedAt: entry?.lastWarnedAt,
      lastBlockedAt: entry?.lastBlockedAt,
    };
    hitCache.set(key, entry);
    if (persistedBlock && persistedBlock <= now) {
      entry.blockUntil = undefined;
    }
  }
  if (entry.blockUntil && now < entry.blockUntil) {
    if (!entry.lastBlockedAt || now - entry.lastBlockedAt > WINDOW_MS) {
      entry.lastBlockedAt = now;
      void recordEvent(req, key, 'blocked', {
        blockDurationMs: entry.blockUntil - now,
        consecutiveBreaches: breachHistory.get(key)?.consecutiveBreaches ?? 0,
      });
    }
    res
      .status(429)
      .json({ success: false, error: 'Too many requests. Please slow down for a few seconds.' });
    return;
  }
  entry.count += 1;
  const warnThreshold = Math.max(1, Math.floor(THRESHOLD * WARN_RATIO));
  if (!entry.warned && entry.count >= warnThreshold) {
    entry.warned = true;
    if (!entry.lastWarnedAt || now - entry.lastWarnedAt > WINDOW_MS) {
      entry.lastWarnedAt = now;
      void recordEvent(req, key, 'near-threshold', { count: entry.count });
    }
  }
  if (!entry.breached && entry.count > THRESHOLD) {
    entry.breached = true;
    const history = breachHistory.get(key);
    const consecutive =
      history && now - history.lastBreachAt <= HISTORY_RESET_MS
        ? history.consecutiveBreaches + 1
        : 1;
    breachHistory.set(key, { consecutiveBreaches: consecutive, lastBreachAt: now });
    if (consecutive >= BREACH_LIMIT) {
      entry.blockUntil = now + WINDOW_MS;
      entry.lastBlockedAt = now;
      void recordEvent(req, key, 'blocked', {
        count: entry.count,
        consecutiveBreaches: consecutive,
      });
      res
        .status(429)
        .json({ success: false, error: 'Too many requests. Please slow down for a few seconds.' });
      return;
    }
    void recordEvent(req, key, 'threshold-exceeded', {
      count: entry.count,
      consecutiveBreaches: consecutive,
    });
  }
  next();
}
function shouldGuard(req: Request): boolean {
  if (req.method === 'OPTIONS') {
    return false;
  }
  if (!PROTECTED_METHODS.includes(req.method.toUpperCase())) {
    return false;
  }
  if (PATH_PREFIXES.length === 0) {
    return true;
  }
  const relativePath =
    typeof (req as { path?: string }).path === 'string'
      ? (req as { path: string }).path
      : typeof req.originalUrl === 'string'
        ? req.originalUrl
        : typeof req.url === 'string'
          ? req.url
          : '';
  const routePath = `${req.baseUrl ?? ''}${relativePath}`;
  return PATH_PREFIXES.some((prefix) => routePath.startsWith(prefix));
}
function resolveCacheKey(req: AuthenticatedRequest): string | undefined {
  const token = req.apiToken?.token ?? extractBearer(req.headers.authorization);
  if (token) {
    return `token:${hashToken(token)}`;
  }
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip =
    typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0]?.trim()
      : Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : req.ip;
  return ip ? `ip:${ip}` : undefined;
}
function extractBearer(header?: string): string | undefined {
  if (!header) return undefined;
  const [scheme, value] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? value : undefined;
}
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
async function recordEvent(
  req: AuthenticatedRequest,
  cacheKey: string,
  type: RateLimitEventType,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    logger.warn('Abuse guard event', {
      type,
      method: req.method,
      path: `${req.baseUrl ?? ''}${req.path ?? ''}`,
      cacheKey,
      tokenOwner: req.apiToken?.owner,
      meta: data,
    });
    if (!admin.apps.length) {
      return;
    }
    await admin
      .firestore()
      .collection(EVENT_COLLECTION)
      .add({
        type,
        method: req.method,
        path: `${req.baseUrl ?? ''}${req.path ?? ''}`,
        cacheKey,
        tokenOwner: req.apiToken?.owner ?? null,
        meta: data ?? null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        windowMs: WINDOW_MS,
        threshold: THRESHOLD,
      });
  } catch (error) {
    logger.error('Failed to record abuse guard event', error);
  }
}
function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(Math.max(value, min), max);
}
export const __abuseGuardInternals =
  process.env.NODE_ENV === 'test'
    ? {
        clear(): void {
          hitCache.clear();
          breachHistory.clear();
        },
        inspectCache(key: string): CacheEntry | undefined {
          return hitCache.get(key);
        },
        inspectHistory(key: string): BreachHistoryEntry | undefined {
          return breachHistory.get(key);
        },
        inspectConfig(): Record<string, number> {
          return {
            WINDOW_MS,
            THRESHOLD,
            WARN_RATIO,
            BREACH_LIMIT,
            HISTORY_RESET_MS,
          };
        },
      }
    : undefined;
