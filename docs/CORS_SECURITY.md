# CORS Security

## Why This Configuration is Secure

**Bearer token APIs are immune to CSRF attacks** because browsers don't automatically send `Authorization` headers (unlike cookies). Origin validation blocks dangerous patterns while allowing legitimate third-party integrations.

## Configuration

**Production**: Empty whitelist = allow all origins after pattern validation
- No maintenance required
- Works for all third-party integrations (Postman, scripts, mobile apps)
- Blocks dangerous patterns: `null`, `file://`, private IPs

**Development**: Localhost origins whitelisted for browser tools

## Blocked Patterns

- `null` origins (sandboxed iframes)
- `file://` protocol
- Private IP ranges (192.168.x.x, 10.x.x.x, etc.)
- Invalid URL formats

## Security Layers

1. Bearer token validation (primary security)
2. Origin pattern validation (defense-in-depth)
3. Rate limiting (abuseGuard)
4. Permission system (GP, WP, TP)
5. Token expiration and revocation

## Security Scanner Response

**"origin: true is overly permissive"**  
Changed to dynamic validation with pattern blocking and logging.

**"Potential CSRF vulnerability"**  
Not applicable - browsers don't auto-send bearer tokens.

**"User-controlled origin without validation"**  
All origins validated via `validateOrigin()` with URL parsing and pattern matching.

## Optional: Strict Whitelist

To restrict to specific origins, populate `getAllowedOrigins()`:

```typescript
export function getAllowedOrigins(): string[] {
  return ['https://tarkovtracker.io'];
}
```

**Trade-off**: Breaks API clients without Origin headers.
