import { vi } from 'vitest';
import '@testing-library/jest-dom';
import { config } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import { createPinia } from 'pinia';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { testI18n } from '@/test/testI18n';

// Mock Firebase - Comprehensive mocks to prevent real Firebase initialization
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
    deleteField: vi.fn(() => ({}) as any),
  };
});

// Mock Firebase Storage to prevent initialization in component tests
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
  // Other exports as needed can be stubbed similarly
}));

// Prevent Firebase Functions initialization in component tests (e.g., AlternativesList)
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({ app: { name: 'mock-app' } })),
  httpsCallable: vi.fn(() => vi.fn(async () => ({ data: {} }))),
  connectFunctionsEmulator: vi.fn(() => undefined),
}));

// (Optional) stabilize timers used by components
vi.useFakeTimers();

// Create global test plugins
const vuetify = createVuetify({
  components,
  directives,
});

const pinia = createPinia();

// Configure Vue Test Utils global plugins
config.global.plugins = [vuetify, testI18n, pinia];

// Global test helpers
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window.matchMedia
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
