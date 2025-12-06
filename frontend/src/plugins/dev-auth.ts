/**
 * Dev Auth Plugin
 *
 * Provides mock authentication for local development without Firebase emulators.
 * Enable by setting VITE_DEV_AUTH=true in your .env.local file.
 *
 * Usage:
 *   1. Create/edit frontend/.env.local
 *   2. Add: VITE_DEV_AUTH=true
 *   3. Run: npm run dev
 *   4. You'll be automatically "logged in" as a dev user
 *
 * Features:
 *   - Mocks fireuser object with realistic data
 *   - Pre-populates localStorage with default user state
 *   - Works without Firebase emulators
 *   - Only active in development mode
 */

import { fireuser } from './firebase';
import { logger } from '@/utils/logger';

type DevUserState = {
  allTipsHidden: boolean;
  hideTips: Record<string, boolean>;
  streamerMode: boolean;
  filters: Record<string, unknown>;
  preferences: Record<string, unknown>;
};

const createDefaultUserState = (): DevUserState => ({
  allTipsHidden: false,
  hideTips: {},
  streamerMode: false,
  filters: {},
  preferences: {},
});

let inMemoryUserState: DevUserState | null = null;

function generateDevUserId(): string {
  const storageAvailable = typeof window !== 'undefined' && !!window.localStorage;
  if (storageAvailable) {
    try {
      let devUserId = window.localStorage.getItem('DEV_USER_ID');
      if (!devUserId) {
        devUserId = 'dev-user-' + Math.random().toString(36).substring(2, 11);
        window.localStorage.setItem('DEV_USER_ID', devUserId);
      }
      return devUserId;
    } catch (error) {
      logger.warn(
        'Dev auth unable to access localStorage for DEV_USER_ID. Using in-memory value.',
        error
      );
    }
  }
  return 'dev-user-' + Math.random().toString(36).substring(2, 11);
}

function initializeUserState(): void {
  const storageAvailable = typeof window !== 'undefined' && !!window.localStorage;
  if (storageAvailable) {
    try {
      const storedUser = window.localStorage.getItem('user');
      if (!storedUser) {
        const defaultUserState = createDefaultUserState();
        window.localStorage.setItem('user', JSON.stringify(defaultUserState));
        inMemoryUserState = defaultUserState;
      }
    } catch (error) {
      logger.warn(
        'Dev auth unable to access localStorage for user state. Falling back to in-memory.',
        error
      );
      if (!inMemoryUserState) {
        inMemoryUserState = createDefaultUserState();
      }
    }
  } else if (!inMemoryUserState) {
    inMemoryUserState = createDefaultUserState();
  }
}

export function initDevAuth(): void {
  // Only run in development mode
  if (!import.meta.env.DEV) {
    return;
  }

  // Check if dev auth is enabled via environment variable
  const devAuthEnabled = import.meta.env.VITE_DEV_AUTH === 'true';

  if (!devAuthEnabled) {
    logger.info('Dev auth disabled. Set VITE_DEV_AUTH=true in .env.local to enable.');
    return;
  }

  const devUserId = generateDevUserId();

  // Mock user object
  const mockUser = {
    uid: devUserId,
    loggedIn: true,
    displayName: 'Dev User',
    email: 'dev@localhost.local',
    photoURL: null,
    emailVerified: true,
    phoneNumber: null,
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  // Inject mock user into fireuser reactive object
  Object.assign(fireuser, mockUser);

  initializeUserState();

  logger.info('🔧 Dev auth initialized:', {
    uid: mockUser.uid,
    email: mockUser.email,
    displayName: mockUser.displayName,
  });

  logger.warn(
    '⚠️  Using mock authentication. Set VITE_DEV_AUTH=false or remove from .env.local to use real auth.'
  );
}
