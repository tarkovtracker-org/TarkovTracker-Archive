# CORS Security

## Why This Configuration is Secure

**Bearer tokens in Authorization headers are not vulnerable to traditional CSRF attacks** because browsers don't automatically include them with cross-site requests (unlike cookies). However, bearer tokens can still be exposed through other vectors such as XSS attacks or token leakage. Origin validation provides defense-in-depth by blocking dangerous patterns while allowing legitimate third-party integrations.

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
1. Origin pattern validation (defense-in-depth)
1. Rate limiting (abuseGuard)
1. Permission system (GP, WP, TP)
1. Token expiration and revocation

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
