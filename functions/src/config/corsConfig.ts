/**
 * CORS Configuration for Bearer Token API
 *
 * Security: Bearer tokens aren't auto-sent by browsers (unlike cookies),
 * so traditional CSRF risks don't apply. Origin validation blocks dangerous
 * patterns while allowing legitimate third-party integrations.
 */

import { logger } from 'firebase-functions';

interface CorsOptions {
  trustNoOrigin?: boolean;
  allowedOrigins?: string[];
}

interface CorsRequest {
  headers: {
    origin?: string;
    'access-control-request-headers'?: string;
  };
}

interface CorsResponse {
  set: (header: string, value: string) => void;
}

/** Validates origin, blocks dangerous patterns, logs suspicious activity */
export function validateOrigin(
  origin: string | undefined,
  options: CorsOptions = {}
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
      /localhost/i,
      /127\.0\.0\.1/i,
      /192\.168\./i,
      /10\./i,
      /172\.(1[6-9]|2[0-9]|3[0-1])\./i,
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
      !originUrl.protocol.startsWith('http') ||
      originUrl.hostname.includes('..') ||
      originUrl.username ||
      originUrl.password
    ) {
      logger.warn(`CORS: Unusual origin format: ${origin}`);
    }

    return origin;
  } catch (error) {
    logger.error(`CORS: Invalid origin format: ${origin}`, error);
    return false;
  }
}

/** Returns whitelist array. Empty array = allow all origins (public API mode) */
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
export function getExpressCorsOptions() {
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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
    res.set('Vary', 'Origin');
  }

  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] || 'Content-Type, Authorization, X-Requested-With'
  );

  return true;
}
