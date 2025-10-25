import { vi } from 'vitest';
import '@testing-library/jest-dom';
import { config } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import { createPinia } from 'pinia';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { testI18n } from '@/test/testI18n';

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
}));

// Mock Apollo Client
vi.mock('@apollo/client/core', () => ({
  ApolloClient: vi.fn(() => ({
    query: vi.fn(),
    mutate: vi.fn(),
  })),
  InMemoryCache: vi.fn(),
  gql: vi.fn(),
}));

// Create global test plugins
const vuetify = createVuetify({
  components,
  directives,
});

const pinia = createPinia();

// Configure Vue Test Utils global plugins
config.global.plugins = [vuetify, testI18n, pinia];

// Global test helpers
global.ResizeObserver = class ResizeObserver {
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
