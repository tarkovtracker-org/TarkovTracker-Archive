# Frontend Testing Guide

## Layers
1. **Unit tests (Vitest)** – Run with `npm run test` (CPU-only) or `npm run test:watch` for TDD flow. `npm run test:coverage` produces coverage reports.
2. **End-to-end tests (Playwright)** – Run `npm run test:e2e` (Chromium headless) or `npm run test:e2e:headed` for a headed browser.
3. **Static checks** – `npm run lint`, `npm run type-check`, `npm run build` ensure the code compiles and the bundles stay healthy.

## Common commands
```bash
npm run test                # Vitest run
npm run test:watch          # Vitest watch mode
npm run test:coverage       # Vitest with coverage
npm run test:e2e            # Playwright headless
npm run test:e2e:headed     # Playwright headed window
```

## Best practices
- Seed data in tests via the helpers under `frontend/src/test/`.
- Use `playwright.config.ts` to adjust browsers, timeouts, and test retries.
- Keep tests deterministic by avoiding `waitForTimeout`; prefer waiting for selectors.
- Run `npm run test` after dependency upgrades or architecture changes.
