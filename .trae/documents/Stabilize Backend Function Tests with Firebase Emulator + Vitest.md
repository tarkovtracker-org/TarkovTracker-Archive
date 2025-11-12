## Current State
- Tests rely on deep mocks for `firebase-admin` and Firestore via `functions/test/setup.ts`.
- Core code conditionally reaches into test files: `functions/src/utils/factory.ts:82–85` requires `../../test/setup` to grab `firestoreMock`.
- Admin init is unconditional in `functions/src/index.ts:12`, not guarded against multiple initializations.
- Vitest config (`functions/vitest.config.js`) loads the mock setup globally and runs mixed tests.

## Problems
- Source code depends on test implementation, creating brittle coupling and ESM/hoisting risks.
- Mocking complex Firestore APIs reduces confidence vs. emulator-backed behavior.
- No deterministic DB reset using emulator; state isolation relies on in-memory mocks.

## Approach
- Introduce emulator-backed integration tests for Firestore/Auth and keep targeted unit tests for pure logic.
- Decouple production code from test mocks; detect emulator via env and initialize Admin once.
- Provide a small helper to flush the emulator DB between tests.

## Changes
1) Factory hardening (no test imports)
- Update `functions/src/utils/factory.ts`:
  - Remove `require('../../test/setup')` logic and `_isMockFunction` checks.
  - Initialize Admin only once: `if (!admin.apps.length) admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-test' });` (guarded).
  - Return `admin.firestore()` and `admin.auth()`; when `FIRESTORE_EMULATOR_HOST` is set, Admin automatically uses emulator.

2) Guarded init in entrypoint
- Change `functions/src/index.ts:12` to guard: `if (!admin.apps.length) admin.initializeApp();`.

3) Emulator test setup
- Add `functions/test/setup-emulator.ts`:
  - Set `process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'` (match your `firebase.json` or CLI port).
  - Set `process.env.GCLOUD_PROJECT = 'test-project'`.
  - If no apps, call `admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT })`.
  - BeforeEach: HTTP DELETE to `http://localhost:8080/emulator/v1/projects/${projectId}/databases/(default)/documents` to flush Firestore; clear any module caches (e.g., `clearDataLoaderCache`).

4) Vitest configs
- Keep existing unit config for mocks: `vitest.config.js` (unchanged).
- Add `functions/vitest.integration.config.js` that:
  - Uses `setupFiles: ['./test/setup-emulator.ts']`.
  - Includes `test/integration/**/*.(test|spec).ts`.
  - Runs tests serially (`sequence.concurrent = false`) if helpful.

5) Scripts
- Add functions workspace scripts:
  - `test:unit`: `vitest run --config vitest.config.js`.
  - `test:emu`: `firebase emulators:exec --only firestore,auth,functions -- vitest run --config vitest.integration.config.js`.

6) Test suite partitioning
- Move DB-interacting specs under `functions/test/integration/` to use the emulator.
- Keep pure logic/middleware pathing/unit specs under `functions/test/unit/` using mocks.

7) FieldValue/Timestamp expectations
- In emulator tests, assert against actual values (e.g., read back timestamps with `.toDate()`), not the mock stubs.
- In unit tests, keep current stubs returned by `functions/test/setup.ts`.

## Validation
- Run `npm run -w functions test:unit` to verify unit suite is stable.
- Run `npm run -w functions test:emu` to execute integration tests under the emulator with DB flush between tests.

## Notes
- Your repo already has emulator configs (`firebase.json`) and root scripts; this plan aligns with them.
- The decoupling removes the brittle `test/setup` import from production code and follows the “Prefer Emulator over deep mocks” guideline.

## Deliverables
- Updated `factory.ts` and `index.ts` guards.
- New `setup-emulator.ts`, `vitest.integration.config.js`, and npm scripts.
- Partitioned tests for unit/integration with emulator-backed coverage.

Confirm and I will implement the changes, wire scripts, and migrate a couple of representative tests to the emulator-backed flow for you.