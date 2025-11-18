# Security Management

This document outlines security practices and vulnerability management for TarkovTracker.

## Security Scanning

### Automated Security Audit

Run the security scan script to check for vulnerabilities across all workspaces:

```bash
npm run security:scan
```

This script will:
- Audit the root workspace and all child workspaces (frontend, functions)
- Provide detailed vulnerability counts by severity (critical, high, moderate, low)
- Show details for critical and high vulnerabilities
- Exit with non-zero code if vulnerabilities are found

### Manual Security Audits

You can also run manual audits for specific workspaces:

```bash
# Audit all workspaces
npm audit

# Audit specific workspace
npm audit --workspace=frontend
npm audit --workspace=functions
```

## Vulnerability Remediation

### Automatic Fixes

For automatically fixable vulnerabilities:

```bash
npm audit fix
```

For force updates (use with caution, may break compatibility):

```bash
npm audit fix --force
```

### Manual Updates

Some vulnerabilities require manual package updates:

1. Identify vulnerable packages from the security scan output
2. Check the recommended fix versions
3. Update `package.json` files with the specific versions
4. Run `npm install` to update lockfiles
5. Verify the fix with `npm run security:scan`

## Security Best Practices

### Dependency Management

- Regular security scans before releases
- Review and update dependencies monthly
- Pin critical security dependencies to specific versions
- Avoid using `npm audit fix --force` in production without testing

### Recent Security Updates

#### js-yaml Prototype Pollution (Fixed)
- **Issue**: js-yaml versions <4.1.1 had prototype pollution vulnerability (CVE-2021-39140)
- **Fix**: Updated firebase-tools to version 13.27.0 which includes patched js-yaml
- **Impact**: Moderate severity vulnerability in development tooling
- **Status**: ✅ Resolved

## Monitoring

- Security scans should be run before every production deployment
- Consider integrating `npm run security:scan` into pre-release checklists
- Monitor npm security advisories for dependencies used in this project

## Reporting Security Issues

If you discover a security vulnerability in TarkovTracker:

1. Do not open a public issue
2. Send a detailed report to the project maintainers
3. Include steps to reproduce and potential impact assessment
4. Allow time for the maintainers to address the issue before disclosure

## Exit Codes

The security scan script uses the following exit codes:
- `0`: No vulnerabilities found
- `1`: Vulnerabilities detected (any severity) or audit errors

This allows the script to be used in CI/CD pipelines for automated security gating.
