/**
 * Unit tests for useFirestoreTarkovItems composable
 * Tests AC: 1-5 from Story 1.1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';

// Mock VueFire BEFORE imports
const mockUseDocument = vi.fn();
const mockUseCollection = vi.fn();
vi.mock('vuefire', () => ({
  useDocument: mockUseDocument,
  useCollection: mockUseCollection,
}));

// Mock Firebase
const mockDoc = vi.fn();
const mockCollection = vi.fn();
vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  collection: mockCollection,
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
    mockCollection.mockReturnValue({ path: 'tarkovData/items/data' });
  });

  it('should successfully retrieve item data from Firestore /tarkovData/items/data (AC: 1, 3)', async () => {
    // Arrange
    const mockItems = [
      { id: 'item1', name: 'Item 1' },
      { id: 'item2', name: 'Item 2' },
    ];

    const mockCollectionData = ref(mockItems);
    const mockCollectionError = ref(null);

    mockUseCollection.mockReturnValue({
      data: mockCollectionData,
      error: mockCollectionError,
    });

    // Act - dynamically import to reset singleton
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    const { items, loading, error } = useFirestoreTarkovItems();

    // Wait for Vue's reactive updates to complete
    await nextTick();

    // Assert
    const { firestore } = await import('@/plugins/firebase');
    expect(mockCollection).toHaveBeenCalledWith(firestore, 'tarkovData', 'items', 'data');
    expect(mockUseCollection).toHaveBeenCalled();
    expect(items.value).toEqual(mockItems);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Loaded 2 Tarkov items from Firestore subcollection cache'
    );
  });

  it('should utilize VueFire for reactive data binding (AC: 4)', async () => {
    // Arrange
    const mockCollectionData = ref([]);
    const mockCollectionError = ref(null);

    mockUseCollection.mockReturnValue({
      data: mockCollectionData,
      error: mockCollectionError,
    });

    // Act
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    useFirestoreTarkovItems();

    // Wait for initialization
    await nextTick();

    // Assert - verify VueFire useCollection was called
    expect(mockUseCollection).toHaveBeenCalledWith(
      { path: 'tarkovData/items/data' },
      { ssrKey: 'tarkov-items-collection' }
    );
  });

  it('should implement singleton pattern - only initialize once (AC: 5)', async () => {
    // Arrange
    const mockItems = [{ id: 'item1', name: 'Item 1' }];
    const mockCollectionData = ref(mockItems);
    const mockCollectionError = ref(null);

    mockUseCollection.mockReturnValue({
      data: mockCollectionData,
      error: mockCollectionError,
    });

    // Act - import once and call multiple times
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    const result1 = useFirestoreTarkovItems();
    const result2 = useFirestoreTarkovItems();
    const result3 = useFirestoreTarkovItems();

    // Wait for watchers
    await nextTick();

    // Assert - useCollection should only be called once (singleton)
    expect(mockUseCollection).toHaveBeenCalledTimes(1);

    // All calls should return the same cached data
    expect(result1.items.value).toEqual(result2.items.value);
    expect(result2.items.value).toEqual(result3.items.value);
  });

  it('should handle Firestore errors gracefully (AC: 2)', async () => {
    // Arrange
    const mockError = new Error('Firestore connection failed');
    const mockCollectionData = ref(undefined);
    const mockCollectionError = ref(mockError);

    mockUseCollection.mockReturnValue({
      data: mockCollectionData,
      error: mockCollectionError,
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
      'Failed to load Tarkov items from Firestore collection:',
      mockError
    );
  });

  it('should handle empty subcollection (AC: 2)', async () => {
    // Arrange
    const mockCollectionData = ref([]); // Subcollection exists but is empty
    const mockCollectionError = ref(null);

    mockUseCollection.mockReturnValue({
      data: mockCollectionData,
      error: mockCollectionError,
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
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Loaded 0 Tarkov items from Firestore subcollection cache'
    );
  });

  it('should initialize with loading state (AC: 2)', async () => {
    // Arrange
    const mockCollectionData = ref(undefined); // Not loaded yet
    const mockCollectionError = ref(null);

    mockUseCollection.mockReturnValue({
      data: mockCollectionData,
      error: mockCollectionError,
    });

    // Act
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    const { loading } = useFirestoreTarkovItems();

    // Assert - should be loading initially
    expect(loading.value).toBe(true);
  });

  it('should handle empty items array (AC: 2)', async () => {
    // Arrange
    const mockCollectionData = ref([]); // Empty array
    const mockCollectionError = ref(null);

    mockUseCollection.mockReturnValue({
      data: mockCollectionData,
      error: mockCollectionError,
    });

    // Act
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    const { items, error } = useFirestoreTarkovItems();

    // Wait for watchers
    await nextTick();

    // Assert
    expect(items.value).toEqual([]);
    expect(error.value).toBeNull();
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Loaded 0 Tarkov items from Firestore subcollection cache'
    );
  });

  it('should handle initialization errors (AC: 2)', async () => {
    // Arrange
    const initError = new Error('Initialization failed');
    mockCollection.mockImplementation(() => {
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
      'Error initializing Firestore Tarkov items collection:',
      initError
    );
  });
});
