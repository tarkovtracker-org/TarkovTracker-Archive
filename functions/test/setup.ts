/**
 * Global Test Setup & Teardown
 *
 * This file configures shared test lifecycle hooks that ensure proper cleanup
 * between test files and individual tests. It runs after Vitest is initialized
 * but before any test files load.
 *
 * ============================================================================
 * CANONICAL FIRESTORE CLEANUP MECHANISM
 * ============================================================================
 *
 * This file implements the SINGLE SOURCE OF TRUTH for Firestore cleanup.
 * All tests in the functions workspace rely on this global afterEach hook.
 *
 * KEY PRINCIPLES:
 * 1. Each test MUST start with a clean Firestore database
 * 2. The global afterEach hook below clears ALL Firestore data after EVERY test
 * 3. Tests should NEVER depend on data from previous tests
 * 4. Tests should seed their own data using seedDb() or suite.withDatabase()
 *
 * WHY THIS APPROACH:
 * - Enforces complete test isolation (no cross-test contamination)
 * - Makes tests deterministic (same results every run)
 * - Simplifies debugging (no mysterious dependencies on test execution order)
 * - Catches state-dependent tests early (they fail without proper seeding)
 * - Works for ALL tests, whether using createTestSuite() or not
 *
 * DO NOT:
 * - Add manual resetDb() calls in test beforeEach/afterEach hooks (redundant)
 * - Call resetDb() within test bodies (use seedDb to add data instead)
 * - Disable this global hook (it ensures no test can leak state)
 *
 * INTEGRATION WITH createTestSuite():
 * - createTestSuite.beforeEach() provides defensive resetDb() for extra safety
 * - This global hook serves as the ultimate safety net
 * - Both approaches work together to guarantee isolation
 *
 * ============================================================================
 */

import { afterEach } from 'vitest';
import { resetDb } from './helpers/emulatorSetup';

/**
 * Global cleanup hook - THE canonical Firestore cleanup mechanism
 *
 * Runs after EVERY test to clear all Firestore emulator data.
 * This guarantees the next test starts with a completely clean database.
 *
 * Implementation details:
 * - Uses the Firebase emulator's REST API to clear all documents
 * - Also clears data loader caches to prevent stale snapshot reuse
 * - Runs even if a test fails or throws an exception
 * - Executes after test-specific afterEach hooks (if any)
 *
 * Performance note:
 * - Clearing the emulator is fast (~10-50ms per test)
 * - This overhead is worth it for guaranteed test isolation
 * - Prevents hard-to-debug failures from test interdependencies
 *
 * Expected test lifecycle:
 * 1. beforeEach: Firestore is clean (from previous test's afterEach)
 * 2. Test setup: Seed data using seedDb() or suite.withDatabase()
 * 3. Test execution: Operate on clean, known state
 * 4. afterEach: This hook clears everything for the next test
 */
afterEach(async () => {
  await resetDb();
});
