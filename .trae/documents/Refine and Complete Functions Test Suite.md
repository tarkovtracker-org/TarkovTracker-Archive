## Goals

* Complete and refine the `functions/test/` suite for reliability, maintainability, and performance.

* Ensure clear organization (unit/integration/e2e), strong coverage (including edge cases), reusable utilities/fixtures, consistent assertions, and actionable CI feedback.

* Document structure and conventions with a README and contributor guidance.

## Test Organization

* Restructure directories to enforce clarity:

  * `test/unit/**` for pure functions/services/utils

  * `test/integration/**` for middleware + handlers + app wiring

  * `test/e2e/**` for end-to-end `onRequest` flows through the Express chain

  * `test/performance/**` remains as-is with dedicated config

  * `test/setup/global.ts` for environment/mocks; `test/setup/unit.ts` and `test/setup/integration.ts` for scoped seeds

  * `test/utils/**` for helpers (HTTP builders, Firestore seeds, token fixtures)

* Naming conventions:

  * Use descriptive file names: `progress.service.unit.test.ts`, `team.handler.integration.test.ts`, `api.e2e.test.ts`

  * Test case names start with the behavior: “returns 403 on missing bearer header”, “generates OpenAPI spec with all routes”

* Separate setup/teardown from test logic using `beforeAll/afterAll/beforeEach/afterEach` in suite files and centralized setup modules.

## Framework & Config

* Keep Vitest as the framework; maintain `environment: 'node'`, globals enabled.

* Split configs:

  * `vitest.config.js` for unit/integration/e2e with `isolate: true` for unit, `false` where shared global state is intentional (integration/e2e)

  * `vitest.performance.config.js` limited to `test/performance/**` with longer timeouts and lower coverage thresholds

* Coverage reporting:

  * Enforce 85% statements/lines in main config; collect `lcov` and `text-summary` outputs

  * Exclude setup/mocks from coverage via `coverage.exclude`

## Utilities & Fixtures

* Add reusable helpers under `test/utils/`:

  * `http.ts`: `makeRequest`, `makeAuthedRequest`, preflight builder, error parser

  * `firestore.ts`: seed/cleanup helpers, transaction conflict simulator

  * `tokens.ts`: factories for valid/invalid permission sets, expired tokens

  * `permissions.ts`: constants/matrix generator to validate route access

  * `time.ts`: fake timers wrappers for scheduled functions

* Fixtures under `test/fixtures/`:

  * `users.ts`, `teams.ts`, `progress.ts` sample documents; edge-case payloads (max/min values, malformed inputs)

* Standardize assertion patterns:

  * Prefer `toEqual`/`toMatchObject` for structure, `toThrowError`/`rejects.toThrow` for errors, and explicit messages

  * Avoid brittle snapshots except for stable outputs (e.g., OpenAPI JSON)

## Mocking Strategy

* Centralize deterministic mocks in `test/setup/global.ts`:

  * `firebase-admin` Firestore/Auth in-memory stubs; `FieldValue` and `Timestamp` shims

  * `firebase-functions` v2 (`onRequest`, `logger`, `HttpsError`) shims

  * `node:crypto` and UID generator deterministic outputs

* Targeted spies/mocks per suite with `vi.spyOn` and module-level `vi.mock` for external boundaries (network/fs) only when they are touched.

* Ensure no real `admin.initializeApp` is invoked in tests (validated via spy).

## Coverage: New/Missing Critical Tests

* Middleware `onRequestAuth` (unit + integration):

  * Success with valid bearer; missing header; malformed scheme; expired token handling; logger calls; short-circuit denial

* OpenAPI generation (unit):

  * Schema/components completeness; route coverage vs app router; version tagging; graceful failure when `package.json` is unreadable

* API entry `src/index.ts`:

  * OPTIONS preflight handling; disallowed origin behavior; lazy app caching behavior across invocations

* TeamService concurrency (unit/integration):

  * Simultaneous `join/leave` conflicts; max members; password-protected join; transactional rollback messages

* TokenService validation (unit):

  * Invalid permission sets; note requirements; revoke non-existent/expired tokens; idempotent revoke

* Scheduled functions (integration):

  * `updateTarkovData` no-op runs; backfill behavior; Firestore batch failure+retry logic; logger output structure

* Permissions matrix (integration):

  * Validate `GP`, `WP`, `TP`, dual-mode across relevant routes; `gameMode` query influence; forbidden → 403; allowed → 200

* Error handling (integration):

  * `notFoundHandler` returns 404 JSON; global `errorHandler` renders proper `code`/`message` including `HttpsError`

## Performance Suite

* Keep performance tests under `test/performance/**` with separate config.

* Add baseline assertions:

  * Route latency SLO (p95) thresholds; heap size growth guard; token workflow throughput

* Use efficient test doubles and seeded datasets; reset shared state between runs using utility cleanup.

## Documentation

* `functions/test/README.md`:

  * Test structure overview; naming/organization conventions

  * Running tests: `npm run test` (unit/integration/e2e), `npm run test:perf` for performance

  * Contribution guide: how to add tests, preferred assertions, mocking rules, fixtures usage

  * CI expectations and coverage thresholds; troubleshooting common failures

## CI/CD Integration

* Add workflow `.github/workflows/functions-tests.yml`:

  * Triggers: `push`/`pull_request` to `master`/`develop`

  * Steps: `actions/setup-node@v4` with Node 22; workspace install `npm ci --workspace functions`; lint `npm run lint --workspace functions`; tests `npm run test --workspace functions` with coverage upload as artifact; cache npm

  * Optional job: performance tests on `workflow_dispatch` or nightly schedule to avoid slowing PR checks

* Fail the job on coverage threshold violation and non-zero tests; produce verbose output for actionable feedback.

## Execution & Verification

* Run the full suite locally and in CI; fix any flaky tests by isolating state and using fake timers where necessary.

* Ensure tests pass consistently across Node 22; verify coverage reports meet thresholds.

* Validate that emulator/network calls are fully mocked; confirm no external I/O occurs during tests.

## Deliverables

* Refined directory structure, updated vitest configs

* New utilities/fixtures and targeted new tests

* Documentation README under `functions/test/`

* CI workflow to run functions tests with coverage

## Next Steps

* Proceed to implement restructuring, utilities, and missing tests, then run and stabilize the suite.

* Open a PR with CI workflow and test README; iterate on feedback while keeping tests fast and deterministic.

