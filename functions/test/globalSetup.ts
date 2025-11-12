/**
 * Vitest Global Setup
 *
 * Configures the test environment, starts Firebase emulators before tests,
 * and cleans up after all tests complete.
 */

import { spawn, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import * as path from 'path';

/**
 * Set up environment variables for emulator access
 */
export function setupEnvironment() {
  // Firebase Emulator Suite hosts
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:5002';
  process.env.FIREBASE_AUTH_EMULATOR_HOST =
    process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';

  // Tell factory.ts to use emulator, not mocks
  process.env.USE_FIREBASE_EMULATOR = 'true';

  // Node environment
  process.env.NODE_ENV = 'test';
  process.env.NODE_OPTIONS = '--max-old-space-size=4096';

  // Suppress Firebase debug logging in tests
  process.env.DEBUG = '';
}

let emulatorProcess: ReturnType<typeof spawn> | null = null;
let emulatorStartTime: number | null = null;

/**
 * Check if Firebase CLI is installed
 */
function hasFirebaseCli(): boolean {
  try {
    const result = spawnSync('which', ['firebase'], { stdio: 'pipe' });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Check if emulators are already running (e.g., started externally)
 */
async function checkEmulatorRunning(host: string, port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://${host}:${port}/`);
    return response.ok || response.status === 404; // 404 is fine, means emulator is up
  } catch {
    return false;
  }
}

/**
 * Start Firebase emulators if not already running
 */
async function startEmulators(): Promise<void> {
  const host = '127.0.0.1';
  const firestorePort = 5002;
  const authPort = 9099;

  // Check if emulators are already running
  const firestoreRunning = await checkEmulatorRunning(host, firestorePort);
  const authRunning = await checkEmulatorRunning(host, authPort);

  if (firestoreRunning && authRunning) {
    console.log('✓ Firebase emulators already running');
    return;
  }

  // If one is running but not the other, something is wrong - warn and skip
  if (firestoreRunning || authRunning) {
    console.warn(
      '⚠ Firebase emulators partially running (Firestore: ' +
        firestoreRunning +
        ', Auth: ' +
        authRunning +
        '). Skipping startup.'
    );
    return;
  }

  // Check if Firebase CLI is available
  if (!hasFirebaseCli()) {
    console.warn(
      '⚠ Firebase CLI not found. Tests will attempt to use mocked or pre-started emulators.'
    );
    return;
  }

  // Check if firebase.json exists (look in current dir and parent dir)
  let firebaseJsonPath = path.join(process.cwd(), 'firebase.json');
  if (!existsSync(firebaseJsonPath)) {
    // Try parent directory (common when running from functions/ subdirectory)
    firebaseJsonPath = path.join(process.cwd(), '..', 'firebase.json');
    if (!existsSync(firebaseJsonPath)) {
      console.warn('⚠ firebase.json not found. Skipping emulator startup.');
      return;
    }
  }

  console.log('Starting Firebase emulators...');

  try {
    // Start emulators using firebase-tools
    const firebaseDir = firebaseJsonPath.endsWith('firebase.json')
      ? path.dirname(firebaseJsonPath)
      : process.cwd();
    emulatorProcess = spawn('firebase', ['emulators:start', '--only', 'firestore,auth'], {
      cwd: firebaseDir,
      stdio: 'inherit', // Show emulator output
      detached: false,
    });

    emulatorStartTime = Date.now();

    // Wait for emulators to be ready
    let ready = false;
    let attempts = 0;
    const maxAttempts = 60; // 30 seconds with 500ms intervals

    while (!ready && attempts < maxAttempts) {
      const firestoreReady = await checkEmulatorRunning(host, firestorePort);
      const authReady = await checkEmulatorRunning(host, authPort);

      if (firestoreReady && authReady) {
        ready = true;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500));
        attempts++;
      }
    }

    if (!ready) {
      throw new Error(
        'Firebase emulators did not start within 30 seconds. Make sure port 8080 (Firestore) and 9099 (Auth) are available.'
      );
    }

    console.log('✓ Firebase emulators ready');
  } catch (err) {
    console.error('Failed to start Firebase emulators:', err);
    throw err;
  }
}

/**
 * Stop Firebase emulators
 */
function stopEmulators(): void {
  if (emulatorProcess) {
    console.log('Stopping Firebase emulators...');

    try {
      // Kill the emulator process
      process.kill(-emulatorProcess.pid!); // Kill process group

      // Wait a bit for graceful shutdown
      setTimeout(() => {
        if (!emulatorProcess?.killed) {
          emulatorProcess?.kill('SIGKILL');
        }
      }, 5000);

      const uptime = emulatorStartTime ? Date.now() - emulatorStartTime : 0;
      const seconds = Math.round(uptime / 1000);
      console.log(`✓ Emulators stopped (ran for ${seconds}s)`);
    } catch (err) {
      console.warn('Error stopping emulators:', err);
    }

    emulatorProcess = null;
  }
}

/**
 * Vitest setup hook - runs before all tests
 */
export async function setup(): Promise<void> {
  setupEnvironment();

  // Check if emulators are already running (manually started by user)
  const host = '127.0.0.1';
  const firestoreRunning = await checkEmulatorRunning(host, 5002);
  const authRunning = await checkEmulatorRunning(host, 9099);

  if (firestoreRunning && authRunning) {
    console.log('✓ Firebase emulators already running (detected running instance)');
    return;
  }

  // Only auto-start if explicitly requested via env var
  if (process.env.AUTO_START_EMULATOR !== 'true') {
    console.warn(
      '⚠ Firebase emulators not detected. Start them manually with: firebase emulators:start --only firestore,auth'
    );
    return;
  }

  // Try to start emulators (only if AUTO_START_EMULATOR=true)
  try {
    await startEmulators();
  } catch (err) {
    console.error(
      'Failed to start Firebase emulators. Make sure they are running manually or set AUTO_START_EMULATOR=true'
    );
    throw err;
  }
}

/**
 * Vitest teardown hook - runs after all tests
 */
export async function teardown(): Promise<void> {
  stopEmulators();
}

/**
 * Ensure emulators are stopped when the process exits
 */
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    stopEmulators();
  });

  process.on('SIGINT', () => {
    stopEmulators();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    stopEmulators();
    process.exit(0);
  });
}
