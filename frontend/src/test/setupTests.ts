import { vi } from 'vitest';
import '@testing-library/jest-dom';
import { config } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import { createPinia } from 'pinia';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { testI18n } from '@/test/testI18n';

/**
 * Lazily initialize the shared Vitest environment.
 * Vitest will call this file once at startup.
 */
export function setupVitestEnvironment(): void {
  // Global error handlers to catch unhandled rejections and exceptions
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    throw reason;
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    throw error;
  });

  if (!global.window) {
    (global as any).window = global;
  }

  if (!global.document) {
    (global as any).document = {
      createElement: () => ({}),
    } as any;
  }

  if (!(window as any).localStorage) {
    (window as any).localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
  }

  if (!(window as any).sessionStorage) {
    (window as any).sessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
  }

  // Firebase mocks shared across tests
  vi.mock('firebase/app', () => ({
    initializeApp: vi.fn(() => ({ app: 'mock-app' })),
    getApp: vi.fn(() => ({ app: 'mock-app' })),
    getApps: vi.fn(() => [{ app: 'mock-app' }]),
    deleteApp: vi.fn(() => Promise.resolve()),
  }));

  vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({
      currentUser: null,
      onAuthStateChanged: vi.fn(() => vi.fn()),
      signOut: vi.fn(() => Promise.resolve()),
      signInWithCustomToken: vi.fn(() => Promise.resolve({ user: { uid: 'test-uid' } })),
    })),
    onAuthStateChanged: vi.fn(() => vi.fn()),
    signInWithPopup: vi.fn(() => Promise.resolve({ user: { uid: 'test-uid' } })),
    signOut: vi.fn(() => Promise.resolve()),
    GoogleAuthProvider: vi.fn(() => ({ providerId: 'google.com' })),
    GithubAuthProvider: vi.fn(() => ({ providerId: 'github.com' })),
  }));

  vi.mock('firebase/firestore', () => {
    const mockDoc = {
      get: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })),
      set: vi.fn(() => Promise.resolve()),
      update: vi.fn(() => Promise.resolve()),
      delete: vi.fn(() => Promise.resolve()),
      onSnapshot: vi.fn(() => vi.fn()),
    };

    const mockCollection = {
      doc: vi.fn(() => mockDoc),
      add: vi.fn(() => Promise.resolve({ id: 'new-doc-id' })),
      where: vi.fn(() => mockCollection),
      orderBy: vi.fn(() => mockCollection),
      limit: vi.fn(() => mockCollection),
      get: vi.fn(() => Promise.resolve({ docs: [], empty: true })),
      onSnapshot: vi.fn(() => vi.fn()),
    };

    return {
      getFirestore: vi.fn(() => ({ db: 'mock-firestore' })),
      collection: vi.fn(() => mockCollection),
      doc: vi.fn(() => mockDoc),
      getDoc: vi.fn(() => Promise.resolve({ exists: false, data: () => ({}) })),
      setDoc: vi.fn(() => Promise.resolve()),
      updateDoc: vi.fn(() => Promise.resolve()),
      deleteDoc: vi.fn(() => Promise.resolve()),
      query: vi.fn(() => mockCollection),
      where: vi.fn(() => mockCollection),
      orderBy: vi.fn(() => mockCollection),
      limit: vi.fn(() => mockCollection),
      onSnapshot: vi.fn(() => vi.fn()),
      serverTimestamp: vi.fn(() => new Date()),
      increment: vi.fn((value) => ({ __increment: value })),
      arrayUnion: vi.fn((item) => ({ __arrayUnion: item })),
      arrayRemove: vi.fn((item) => ({ __arrayRemove: item })),
      deleteField: vi.fn(() => ({} as any)),
    };
  });

  vi.mock('firebase/storage', () => ({
    getStorage: vi.fn(() => ({ app: { name: 'mock-app' } })),
    ref: vi.fn((..._args: any[]) => ({ fullPath: 'mock/path' })),
    getDownloadURL: vi.fn(async () => ''),
    uploadBytes: vi.fn(async () => ({ ref: { fullPath: 'mock/path' }, metadata: {} })),
    deleteObject: vi.fn(async () => undefined),
    listAll: vi.fn(async () => ({ prefixes: [], items: [] })),
    connectStorageEmulator: vi.fn(() => undefined),
    updateMetadata: vi.fn(async () => ({})),
    getMetadata: vi.fn(async () => ({})),
  }));

  vi.mock('firebase/functions', () => ({
    getFunctions: vi.fn(() => ({ app: { name: 'mock-app' } })),
    httpsCallable: vi.fn(() => vi.fn(async () => ({ data: {} }))),
    connectFunctionsEmulator: vi.fn(() => undefined),
  }));

  

  const vuetify = createVuetify({
    components,
    directives,
  });
  const pinia = createPinia();
  config.global.plugins = [vuetify, testI18n, pinia];

  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

setupVitestEnvironment();
