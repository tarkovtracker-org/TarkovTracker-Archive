/**
 * Unit tests for useFirestoreTarkovItems composable
 * Tests AC: 1-5 from Story 1.1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';

// Mock VueFire BEFORE imports
const mockUseDocument = vi.fn();
vi.mock('vuefire', () => ({
  useDocument: mockUseDocument,
}));

// Mock Firebase
const mockDoc = vi.fn();
vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
}));

// Mock Firebase plugin
vi.mock('@/plugins/firebase', () => ({
  firestore: {},
}));

// Mock logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
vi.mock('@/utils/logger', () => ({
  logger: mockLogger,
}));

describe('useFirestoreTarkovItems', () => {
  beforeEach(() => {
    // Reset modules to clear singleton state
    vi.resetModules();

    // Clear all mocks
    vi.clearAllMocks();
    mockDoc.mockReturnValue({ path: 'tarkovData/items' });
  });

  it('should successfully retrieve item data from Firestore /tarkovData/items (AC: 1, 3)', async () => {
    // Arrange
    const mockItems = [
      { id: 'item1', name: 'Item 1' },
      { id: 'item2', name: 'Item 2' },
    ];

    const mockDocData = ref({ items: mockItems });
    const mockDocError = ref(null);

    mockUseDocument.mockReturnValue({
      data: mockDocData,
      error: mockDocError,
    });

    // Act - dynamically import to reset singleton
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    const { items, loading, error } = useFirestoreTarkovItems();

    // Wait for Vue's reactive updates to complete
    await nextTick();

    // Assert
    const { firestore } = await import('@/plugins/firebase');
    expect(mockDoc).toHaveBeenCalledWith(firestore, 'tarkovData', 'items');
    expect(mockUseDocument).toHaveBeenCalled();
    expect(items.value).toEqual(mockItems);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(mockLogger.info).toHaveBeenCalledWith('Loaded 2 Tarkov items from Firestore cache');
  });

  it('should utilize VueFire for reactive data binding (AC: 4)', async () => {
    // Arrange
    const mockDocData = ref({ items: [] });
    const mockDocError = ref(null);

    mockUseDocument.mockReturnValue({
      data: mockDocData,
      error: mockDocError,
    });

    // Act
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    useFirestoreTarkovItems();

    // Wait for initialization
    await nextTick();

    // Assert - verify VueFire useDocument was called
    expect(mockUseDocument).toHaveBeenCalledWith(
      { path: 'tarkovData/items' },
      { ssrKey: 'tarkov-items' }
    );
  });

  it('should implement singleton pattern - only initialize once (AC: 5)', async () => {
    // Arrange
    const mockItems = [{ id: 'item1', name: 'Item 1' }];
    const mockDocData = ref({ items: mockItems });
    const mockDocError = ref(null);

    mockUseDocument.mockReturnValue({
      data: mockDocData,
      error: mockDocError,
    });

    // Act - import once and call multiple times
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    const result1 = useFirestoreTarkovItems();
    const result2 = useFirestoreTarkovItems();
    const result3 = useFirestoreTarkovItems();

    // Wait for watchers
    await nextTick();

    // Assert - useDocument should only be called once (singleton)
    expect(mockUseDocument).toHaveBeenCalledTimes(1);

    // All calls should return the same cached data
    expect(result1.items.value).toEqual(result2.items.value);
    expect(result2.items.value).toEqual(result3.items.value);
  });

  it('should handle Firestore errors gracefully (AC: 2)', async () => {
    // Arrange
    const mockError = new Error('Firestore connection failed');
    const mockDocData = ref(undefined);
    const mockDocError = ref(mockError);

    mockUseDocument.mockReturnValue({
      data: mockDocData,
      error: mockDocError,
    });

    // Act
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    const { items, loading, error } = useFirestoreTarkovItems();

    // Wait for watchers
    await nextTick();

    // Assert
    expect(error.value).toBe(mockError);
    expect(items.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to load Tarkov items from Firestore:',
      mockError
    );
  });

  it('should handle missing items field in document (AC: 2)', async () => {
    // Arrange
    const mockDocData = ref({}); // Document exists but no 'items' field
    const mockDocError = ref(null);

    mockUseDocument.mockReturnValue({
      data: mockDocData,
      error: mockDocError,
    });

    // Act
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    const { items, loading, error } = useFirestoreTarkovItems();

    // Wait for watchers
    await nextTick();

    // Assert
    expect(items.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('Tarkov items document exists but has no items field');
  });

  it('should initialize with loading state (AC: 2)', async () => {
    // Arrange
    const mockDocData = ref(undefined); // Not loaded yet
    const mockDocError = ref(null);

    mockUseDocument.mockReturnValue({
      data: mockDocData,
      error: mockDocError,
    });

    // Act
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    const { loading } = useFirestoreTarkovItems();

    // Assert - should be loading initially
    expect(loading.value).toBe(true);
  });

  it('should handle empty items array (AC: 2)', async () => {
    // Arrange
    const mockDocData = ref({ items: [] });
    const mockDocError = ref(null);

    mockUseDocument.mockReturnValue({
      data: mockDocData,
      error: mockDocError,
    });

    // Act
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    const { items, error } = useFirestoreTarkovItems();

    // Wait for watchers
    await nextTick();

    // Assert
    expect(items.value).toEqual([]);
    expect(error.value).toBeNull();
    expect(mockLogger.info).toHaveBeenCalledWith('Loaded 0 Tarkov items from Firestore cache');
  });

  it('should handle initialization errors (AC: 2)', async () => {
    // Arrange
    const initError = new Error('Initialization failed');
    mockDoc.mockImplementation(() => {
      throw initError;
    });

    // Act
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    const { error, loading, items } = useFirestoreTarkovItems();

    // Wait for error handling
    await nextTick();

    // Assert
    expect(error.value).toBe(initError);
    expect(loading.value).toBe(false);
    expect(items.value).toEqual([]);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error initializing Firestore Tarkov items:',
      initError
    );
  });
});
