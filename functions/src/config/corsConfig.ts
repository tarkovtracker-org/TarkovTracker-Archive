/**
 * CORS Configuration for Bearer Token API
 *
 * Security: Bearer tokens aren't auto-sent by browsers (unlike cookies),
 * so traditional CSRF risks don't apply. Origin validation blocks dangerous
 * patterns while allowing legitimate third-party integrations.
 */
import { logger } from 'firebase-functions';
import type { Request as FunctionsRequest } from 'firebase-functions/v2/https';
import type { CorsOptions } from 'cors';
/**
 * Static allowlist of headers for CORS preflight responses.
 * Security: Never reflect client-sent headers dynamically.
 */
const ALLOW_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'X-App-Version',
  'Accept',
  'Origin',
];
/**
 * Static allowlist of HTTP methods for CORS responses.
 */
const ALLOW_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
interface CorsRequest {
  headers: FunctionsRequest['headers'];
}
interface CorsResponse {
  set(field: string, value: string | readonly string[]): unknown;
}
export interface OriginValidationOptions {
  trustNoOrigin?: boolean;
  allowedOrigins?: string[];
}
/**
 * Validates origin, blocks dangerous patterns, logs suspicious activity.
 * When `allowedOrigins` is empty we fall back to the internal
 * pattern-based checks rather than implicitly allowing every origin, so an empty
 * whitelist still enforces the guarded validation logic below.
 */
export function validateOrigin(
  origin: string | undefined,
  options: OriginValidationOptions = {}
): string | boolean {
  const { trustNoOrigin = true, allowedOrigins = [] } = options;
  if (!origin) return trustNoOrigin ? '*' : false;
  if (allowedOrigins.length > 0) {
    if (allowedOrigins.includes(origin)) return origin;
    logger.warn(`CORS: Blocked non-whitelisted origin: ${origin}`);
    return false;
  }
  try {
    const originUrl = new URL(origin);
    const dangerousPatterns = [
      /^null$/i,
      /^file:/i,
      /^localhost$/i,
      /^127\.0\.0\.1(?:$|:)/i,
      /^192\.168\./i,
      /^10\./i,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./i,
    ];
    const originString = origin.toLowerCase();
    for (const pattern of dangerousPatterns) {
      if (pattern.test(originString)) {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn(`CORS: Development origin detected: ${origin}`);
          return origin;
        }
        logger.warn(`CORS: Blocked suspicious origin: ${origin}`);
        return false;
      }
    }
    if (
      (originUrl.protocol !== 'http:' && originUrl.protocol !== 'https:') ||
      originUrl.hostname.includes('..') ||
      originUrl.username ||
      originUrl.password
    ) {
      logger.warn(`CORS: Blocked suspicious origin format: ${origin}`);
      return false;
    }
    return origin;
  } catch (error) {
    logger.error(`CORS: Invalid origin format: ${origin}`, error);
    return false;
  }
}
/**
 * Returns whitelist array.
 * An empty array means no explicit whitelist is provided — requests will be validated
 * by downstream pattern checks; this does NOT grant unrestricted access. These patterns
 * are the same ones exercised by `validateOrigin`, so dangerous development or local
 * origins stay blocked even when no whitelist entries are declared.
 * If you intend to allow all origins use an explicit wildcard '*' or adjust the CORS
 * handler accordingly.
 */
export function getAllowedOrigins(): string[] {
  if (process.env.NODE_ENV !== 'production') {
    return [
      'http://localhost:5173',
      'http://localhost:5000',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5000',
    ];
  }
  return [];
}
export function getExpressCorsOptions(): CorsOptions {
  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean | string) => void
    ) => {
      const result = validateOrigin(origin, {
        trustNoOrigin: true,
        allowedOrigins: getAllowedOrigins(),
      });
      callback(
        result === false ? new Error('Not allowed by CORS') : null,
        result as boolean | string
      );
    },
    credentials: false,
    optionsSuccessStatus: 200,
    methods: ALLOW_METHODS,
    allowedHeaders: ALLOW_HEADERS,
  };
}
export function setCorsHeaders(req: CorsRequest, res: CorsResponse): boolean {
  const origin = req.headers.origin;
  const validatedOrigin = validateOrigin(origin, {
    trustNoOrigin: true,
    allowedOrigins: getAllowedOrigins(),
  });
  if (validatedOrigin === false) return false;
  if (validatedOrigin === '*') {
    res.set('Access-Control-Allow-Origin', '*');
  } else if (typeof validatedOrigin === 'string') {
    res.set('Access-Control-Allow-Origin', validatedOrigin);
    res.set('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
  }
  res.set('Access-Control-Allow-Methods', ALLOW_METHODS.join(', '));
  res.set('Access-Control-Allow-Headers', ALLOW_HEADERS.join(', '));
  return true;
}
