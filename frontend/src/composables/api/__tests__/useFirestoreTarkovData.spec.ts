/**
 * Unit tests for useFirestoreTarkovItems composable
 * Tests AC: 1-5 from Story 1.1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';

// Mock VueFire BEFORE imports
const mockUseCollection = vi.fn();
vi.mock('vuefire', () => ({
  useCollection: mockUseCollection,
}));

// Mock Firebase
const mockCollection = vi.fn();
vi.mock('firebase/firestore', () => ({
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
    mockCollection.mockReturnValue({ path: 'tarkovData/items/shards' });
  });

  it('should successfully retrieve item data from Firestore shards (AC: 1, 3)', async () => {
    // Arrange
    const mockShardDocs = [
      {
        id: '001',
        data: [
          { id: 'item1', name: 'Item 1' },
          { id: 'item2', name: 'Item 2' },
        ],
      },
      {
        id: '002',
        data: [{ id: 'item3', name: 'Item 3' }],
      },
    ];
    const mockItems = [
      { id: 'item1', name: 'Item 1' },
      { id: 'item2', name: 'Item 2' },
      { id: 'item3', name: 'Item 3' },
    ];

    const mockCollectionData = ref(mockShardDocs);
    const mockCollectionError = ref(undefined);
    const mockCollectionPending = ref(false);

    mockUseCollection.mockReturnValue({
      data: mockCollectionData,
      error: mockCollectionError,
      pending: mockCollectionPending,
    });

    // Act - dynamically import to reset singleton
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    const { items, loading, error } = useFirestoreTarkovItems();

    // Wait for Vue's reactive updates to complete
    await nextTick();

    // Assert
    const { firestore } = await import('@/plugins/firebase');
    expect(mockCollection).toHaveBeenCalledWith(firestore, 'tarkovData', 'items', 'shards');
    expect(mockUseCollection).toHaveBeenCalledWith(
      { path: 'tarkovData/items/shards' },
      { ssrKey: 'tarkov-item-shards' }
    );
    expect(items.value).toEqual(mockItems);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Loaded 3 Tarkov items from Firestore shard cache'
    );
  });

  it('should utilize VueFire for reactive data binding (AC: 4)', async () => {
    // Arrange
    const mockCollectionData = ref([]);
    const mockCollectionError = ref(undefined);
    const mockCollectionPending = ref(false);

    mockUseCollection.mockReturnValue({
      data: mockCollectionData,
      error: mockCollectionError,
      pending: mockCollectionPending,
    });

    // Act
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    useFirestoreTarkovItems();

    // Wait for initialization
    await nextTick();

    // Assert - verify VueFire useDocument was called
    expect(mockUseCollection).toHaveBeenCalledWith(
      { path: 'tarkovData/items/shards' },
      { ssrKey: 'tarkov-item-shards' }
    );
  });

  it('should implement singleton pattern - only initialize once (AC: 5)', async () => {
    // Arrange
    const mockShardDocs = [
      { id: '001', data: [{ id: 'item1', name: 'Item 1' }] },
      { id: '002', data: [{ id: 'item2', name: 'Item 2' }] },
    ];
    const mockItems = [
      { id: 'item1', name: 'Item 1' },
      { id: 'item2', name: 'Item 2' },
    ];
    const mockCollectionData = ref(mockShardDocs);
    const mockCollectionError = ref(undefined);
    const mockCollectionPending = ref(false);

    mockUseCollection.mockReturnValue({
      data: mockCollectionData,
      error: mockCollectionError,
      pending: mockCollectionPending,
    });

    // Act - import once and call multiple times
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    const result1 = useFirestoreTarkovItems();
    const result2 = useFirestoreTarkovItems();
    const result3 = useFirestoreTarkovItems();

    // Wait for watchers
    await nextTick();

    // Assert - useDocument should only be called once (singleton)
    expect(mockUseCollection).toHaveBeenCalledTimes(1);

    // All calls should return the same cached data
    expect(result1.items.value).toEqual(result2.items.value);
    expect(result2.items.value).toEqual(result3.items.value);
    expect(result1.items.value).toEqual(mockItems);
  });

  it('should handle Firestore errors gracefully (AC: 2)', async () => {
    // Arrange
    const mockError = new Error('Firestore connection failed');
    const mockCollectionData = ref([]);
    const mockCollectionError = ref(mockError);
    const mockCollectionPending = ref(false);

    mockUseCollection.mockReturnValue({
      data: mockCollectionData,
      error: mockCollectionError,
      pending: mockCollectionPending,
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
    const mockCollectionData = ref([{ id: '001' }]); // shard document without data array
    const mockCollectionError = ref(undefined);
    const mockCollectionPending = ref(false);

    mockUseCollection.mockReturnValue({
      data: mockCollectionData,
      error: mockCollectionError,
      pending: mockCollectionPending,
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
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Tarkov items document exists but has no items field'
    );
  });

  it('should initialize with loading state (AC: 2)', async () => {
    // Arrange
    const mockCollectionData = ref([]);
    const mockCollectionError = ref(undefined);
    const mockCollectionPending = ref(true);

    mockUseCollection.mockReturnValue({
      data: mockCollectionData,
      error: mockCollectionError,
      pending: mockCollectionPending,
    });

    // Act
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    const { loading } = useFirestoreTarkovItems();

    // Assert - should be loading initially
    expect(loading.value).toBe(true);
  });

  it('should handle empty shard data (AC: 2)', async () => {
    // Arrange
    const mockCollectionData = ref([{ id: '001', data: [] }]);
    const mockCollectionError = ref(undefined);
    const mockCollectionPending = ref(false);

    mockUseCollection.mockReturnValue({
      data: mockCollectionData,
      error: mockCollectionError,
      pending: mockCollectionPending,
    });

    // Act
    const { useFirestoreTarkovItems } = await import('../useFirestoreTarkovData');
    const { items, error } = useFirestoreTarkovItems();

    // Wait for watchers
    await nextTick();

    // Assert
    expect(items.value).toEqual([]);
    expect(error.value).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Tarkov items document exists but has no items field'
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
      'Error initializing Firestore Tarkov items:',
      initError
    );
  });
});
