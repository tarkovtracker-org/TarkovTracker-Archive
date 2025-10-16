import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Firebase
vi.mock('@/plugins/firebase', () => ({
  enableAnalyticsCollection: vi.fn(() => Promise.resolve()),
  disableAnalyticsCollection: vi.fn(),
}));

describe('usePrivacyConsent', () => {
  let localStorageMock: Record<string, string>;
  const storageKey = 'tt-analytics-consent';
  let usePrivacyConsent: typeof import('../usePrivacyConsent').usePrivacyConsent;
  let __privacyConsentInternals: typeof import('../usePrivacyConsent').__privacyConsentInternals;

  beforeEach(async () => {
    // Reset module state by reimporting
    vi.resetModules();

    // Mock localStorage
    localStorageMock = {};
    const storage = {
      getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      key: vi.fn(),
      get length() {
        return Object.keys(localStorageMock).length;
      },
    };

    Object.defineProperty(global, 'localStorage', {
      value: storage,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'localStorage', {
      value: storage,
      writable: true,
      configurable: true,
    });

    // Mock window.clarity
    global.window.clarity = undefined;

    // Mock document
    global.document = {
      createElement: vi.fn(() => ({
        async: false,
        src: '',
      })),
      getElementsByTagName: vi.fn(() => [
        {
          parentNode: {
            insertBefore: vi.fn(),
          },
        },
      ]),
      head: {
        appendChild: vi.fn(),
      },
    } as unknown as Document;

    ({ usePrivacyConsent, __privacyConsentInternals } = await import('../usePrivacyConsent'));

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeConsent', () => {
    it('initializes with unknown status when no storage exists', () => {
      const consent = usePrivacyConsent();
      consent.initializeConsent();

      expect(consent.consentStatus.value).toBe('unknown');
      expect(consent.bannerVisible.value).toBe(true);
    });

    it('initializes with accepted status from storage', () => {
      localStorageMock[storageKey] = 'accepted';

      const consent = usePrivacyConsent();
      consent.initializeConsent();

      // State should reflect the stored value
      expect(consent.consentStatus.value).toBe('accepted');
      expect(consent.bannerVisible.value).toBe(false);
    });

    it('initializes with rejected status from storage', () => {
      localStorageMock[storageKey] = 'rejected';

      const consent = usePrivacyConsent();
      consent.initializeConsent();

      expect(consent.consentStatus.value).toBe('rejected');
      expect(consent.bannerVisible.value).toBe(false);
    });

    it('ignores invalid storage values', () => {
      localStorageMock[storageKey] = 'invalid';

      const consent = usePrivacyConsent();
      consent.initializeConsent();

      expect(consent.consentStatus.value).toBe('unknown');
      expect(consent.bannerVisible.value).toBe(true);
    });

    it('only initializes once', () => {
      const consent = usePrivacyConsent();
      consent.initializeConsent();
      const firstStatus = consent.consentStatus.value;

      // Try to reinitialize with different storage value
      global.localStorage.getItem = vi.fn(() => 'accepted');
      consent.initializeConsent();

      // Should still have the original status (already initialized)
      expect(consent.consentStatus.value).toBe(firstStatus);
    });

    it('handles localStorage access errors gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Create a new localStorage mock that throws
      const throwingGetItem = vi.fn(() => {
        throw new Error('Storage access denied');
      });

      Object.defineProperty(global, 'localStorage', {
        get: () => ({
          getItem: throwingGetItem,
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
          key: vi.fn(),
          length: 0,
        }),
        configurable: true,
      });
      Object.defineProperty(window, 'localStorage', {
        get: () => ({
          getItem: throwingGetItem,
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
          key: vi.fn(),
          length: 0,
        }),
        configurable: true,
      });

      const consent = usePrivacyConsent();
      consent.initializeConsent();

      // getStorage() should catch the error and warn
      // Then initialize will continue with storage = undefined
      expect(consent.consentStatus.value).toBe('unknown');
      expect(consent.bannerVisible.value).toBe(true);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('accept', () => {
    it('sets consent status to accepted', () => {
      const consent = usePrivacyConsent();
      consent.accept();

      expect(consent.consentStatus.value).toBe('accepted');
    });

    it('hides the banner', () => {
      const consent = usePrivacyConsent();
      consent.initializeConsent();
      consent.accept();

      expect(consent.bannerVisible.value).toBe(false);
    });

    it('enables analytics collection', async () => {
      const { enableAnalyticsCollection } = await import('@/plugins/firebase');
      const consent = usePrivacyConsent();

      consent.accept();

      expect(enableAnalyticsCollection).toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('sets consent status to rejected', () => {
      const consent = usePrivacyConsent();
      consent.reject();

      expect(consent.consentStatus.value).toBe('rejected');
    });

    it('hides the banner', () => {
      const consent = usePrivacyConsent();
      consent.initializeConsent();
      consent.reject();

      expect(consent.bannerVisible.value).toBe(false);
    });

    it('disables analytics collection', async () => {
      const { disableAnalyticsCollection } = await import('@/plugins/firebase');
      const consent = usePrivacyConsent();

      consent.reject();

      expect(disableAnalyticsCollection).toHaveBeenCalled();
    });
  });

  describe('openPreferences', () => {
    it('shows the banner', () => {
      const consent = usePrivacyConsent();
      consent.accept();
      expect(consent.bannerVisible.value).toBe(false);

      consent.openPreferences();
      expect(consent.bannerVisible.value).toBe(true);
    });
  });

  describe('resetConsent', () => {
    it('resets consent status to unknown', () => {
      const consent = usePrivacyConsent();
      consent.accept();

      consent.resetConsent();
      expect(consent.consentStatus.value).toBe('unknown');
    });

    it('shows the banner', () => {
      const consent = usePrivacyConsent();
      consent.accept();

      consent.resetConsent();
      expect(consent.bannerVisible.value).toBe(true);
    });

    it('disables analytics', async () => {
      const { disableAnalyticsCollection } = await import('@/plugins/firebase');
      const consent = usePrivacyConsent();

      consent.resetConsent();
      expect(disableAnalyticsCollection).toHaveBeenCalled();
    });
  });

  describe('computed properties', () => {
    it('consentGiven is true when status is accepted', () => {
      const consent = usePrivacyConsent();
      consent.accept();

      expect(consent.consentGiven.value).toBe(true);
    });

    it('consentGiven is false when status is not accepted', () => {
      const consent = usePrivacyConsent();
      consent.reject();

      expect(consent.consentGiven.value).toBe(false);
    });

    it('choiceRecorded is true when status is not unknown', () => {
      const consent = usePrivacyConsent();
      consent.accept();

      expect(consent.choiceRecorded.value).toBe(true);
    });

    it('choiceRecorded changes based on status', () => {
      const consent = usePrivacyConsent();
      // After accepting, choice is recorded
      consent.accept();
      expect(consent.choiceRecorded.value).toBe(true);

      // After resetting, choice is not recorded
      consent.resetConsent();
      expect(consent.choiceRecorded.value).toBe(false);
    });
  });

  describe('Clarity integration', () => {
    it('calls clarity consent when enabled', () => {
      const mockClarity = vi.fn();
      global.window.clarity = mockClarity;

      __privacyConsentInternals.enableClarity();

      expect(mockClarity).toHaveBeenCalledWith('consent', true);
    });

    it('calls clarity consent when disabled', () => {
      const mockClarity = vi.fn();
      global.window.clarity = mockClarity;

      __privacyConsentInternals.disableClarity();

      expect(mockClarity).toHaveBeenCalledWith('consent', false);
    });

    it('handles missing window gracefully', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing undefined window
      global.window = undefined;

      expect(() => __privacyConsentInternals.enableClarity()).not.toThrow();
      expect(() => __privacyConsentInternals.disableClarity()).not.toThrow();

      global.window = originalWindow;
    });

    it('handles missing document gracefully', () => {
      const originalDocument = global.document;
      // @ts-expect-error - Testing undefined document
      global.document = undefined;

      expect(() => __privacyConsentInternals.enableClarity()).not.toThrow();

      global.document = originalDocument;
    });
  });

  describe('error handling', () => {
    it('handles analytics enable errors gracefully', async () => {
      const { enableAnalyticsCollection } = await import('@/plugins/firebase');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(enableAnalyticsCollection).mockRejectedValueOnce(
        new Error('Analytics init failed')
      );

      const consent = usePrivacyConsent();
      consent.accept();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unable to enable analytics collection:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('state persistence', () => {
    it('maintains consent across multiple instances', () => {
      const consent1 = usePrivacyConsent();
      consent1.accept();

      const consent2 = usePrivacyConsent();
      expect(consent2.consentStatus.value).toBe('accepted');
    });

    it('synchronizes state between instances', () => {
      const consent1 = usePrivacyConsent();
      const consent2 = usePrivacyConsent();

      consent1.accept();
      expect(consent2.consentStatus.value).toBe('accepted');

      consent2.reject();
      expect(consent1.consentStatus.value).toBe('rejected');
    });
  });
});
