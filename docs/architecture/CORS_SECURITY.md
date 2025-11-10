# CORS Security

We still validate `Origin` even though the API uses bearer tokens (browsers do not
automatically send them), because it stops malicious iframes and curious scripts from
reaching our Express layer before authentication kicks in.

## Origin validation

- `validateOrigin()` (see `functions/src/config/corsConfig.ts`) blocks:
  - `null` or `file:` origins, embedded credentials (`user:pass@host`), and protocols
    other than `http(s)`
  - Localhost/loopback/private IP ranges in production (e.g. `localhost`, `127.0.0.1`, `192.168.*`)
  - Hostnames containing `..`, or origins with username/password fragments
  - Invalid URLs (fails gracefully and logs the bad origin)
- If the whitelist (returned by `getAllowedOrigins`) is non-empty, the whitelist is
  enforced; otherwise we fall back to the same pattern checks above, so an empty array
  does not mean “allow everything”.

## Environment behavior

- **Production:** `getAllowedOrigins()` returns `[]` so only pattern-based validation runs.
- **Development:** localhost variants (`localhost:5173`, `127.0.0.1:5000`, etc.) are added
  to the whitelist so browser tooling works without modifying the production guard.

## Express integration

- `setCorsHeaders()` sets `Access-Control-Allow-Origin`, `Vary`, headers, and methods;
  it returns `false` (403) when an origin is denied.
- `getExpressCorsOptions()` feeds the same validation into the `cors` middleware used by
  the Express app for all `/api/**` endpoints.

## Why it matters

- Even if an upstream token leaks, the origin validation adds a second hard-to-bypass
  fence before the request reaches the middleware chain. Whenever the policy changes,
  update `functions/src/config/corsConfig.ts` and document the change here.
