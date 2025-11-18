import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import type { TarkovMap } from '@/types/models/tarkov';

// Test data fixtures
const createMockMap = (id: string, name: string): TarkovMap =>
  ({
    id,
    name,
    normalizedName: name.toLowerCase().replace(/\s+/g, ''),
  }) as TarkovMap;

const mockStaticMapData = {
  factory: {
    svg: '<svg>Factory SVG</svg>',
    unavailableMessage: null,
  },
  customs: {
    svg: '<svg>Customs SVG</svg>',
    unavailableMessage: null,
  },
  woods: {
    svg: null,
    unavailableMessage: 'Woods temporarily unavailable',
  },
  lab: {
    svg: '<svg>Lab SVG</svg>',
    unavailableMessage: null,
  },
  groundzero: {
    svg: '<svg>Ground Zero SVG</svg>',
    unavailableMessage: null,
  },
};

// Mock logger to spy on warnings
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock dependencies
vi.mock('@/stores/tarkov', () => ({
  useTarkovStore: vi.fn(() => ({
    getCurrentGameMode: vi.fn(() => 'regular'),
  })),
}));

vi.mock('@/utils/mapNormalization', () => ({
  isMapVariant: vi.fn((mapName: string) => {
    // Mock variant detection for known variants
    const variants = ['night factory', 'ground zero 21+', 'the labyrinth'];
    return variants.includes(mapName.toLowerCase());
  }),
}));

vi.mock('@/utils/logger', () => ({
  logger: mockLogger,
}));

describe('useMapData', () => {
  let mockQueryResult: any;
  let mockStaticMapDataRef: any;
  let mockUseTarkovDataQuery: any;
  let mockUseTarkovApi: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    mockLogger.warn.mockClear();

    // Setup fresh mocks for each test
    mockQueryResult = ref({
      maps: [
        createMockMap('factory', 'Factory'),
        createMockMap('factory-night', 'Night Factory'), // Variant
        createMockMap('customs', 'Customs'),
        createMockMap('woods', 'Woods'),
        createMockMap('lab', 'The Lab'),
        createMockMap('ground-zero', 'Ground Zero'),
        createMockMap('ground-zero-21', 'Ground Zero 21+'), // Variant
        createMockMap('labyrinth', 'The Labyrinth'), // Variant
      ],
    });

    mockStaticMapDataRef = ref(mockStaticMapData);

    mockUseTarkovDataQuery = vi.fn(() => ({
      result: mockQueryResult,
      error: ref(null),
      loading: ref(false),
    }));

    mockUseTarkovApi = vi.fn(() => ({
      staticMapData: mockStaticMapDataRef,
    }));

    // Setup mocks
    vi.doMock('@/composables/api/useTarkovApi', () => ({
      useTarkovDataQuery: mockUseTarkovDataQuery,
      useTarkovApi: mockUseTarkovApi,
    }));

    // Reset module to clear warning sets
    vi.resetModules();
  });

  describe('maps computed property', () => {
    it('filters out map variants', async () => {
      const { useMapData } = await import('../useMapData');
      const { maps } = useMapData();

      expect(maps.value).toHaveLength(5); // Should exclude variants
      expect(maps.value.map((m) => m.name)).not.toContain('Night Factory');
      expect(maps.value.map((m) => m.name)).not.toContain('Ground Zero 21+');
      expect(maps.value.map((m) => m.name)).not.toContain('The Labyrinth');
    });

    it('sorts maps by MAP_DISPLAY_ORDER', async () => {
      const { useMapData } = await import('../useMapData');
      const { maps } = useMapData();

      const mapNames = maps.value.map((m) => m.name);
      const expectedOrder = ['Factory', 'Customs', 'Woods', 'The Lab', 'Ground Zero'];
      expect(mapNames).toEqual(expectedOrder);
    });

    it('merges static SVG data when available', async () => {
      const { useMapData } = await import('../useMapData');
      const { maps } = useMapData();

      const factoryMap = maps.value.find((m) => m.id === 'factory');
      const customsMap = maps.value.find((m) => m.id === 'customs');
      const woodsMap = maps.value.find((m) => m.id === 'woods');

      expect(factoryMap?.svg).toBe('<svg>Factory SVG</svg>');
      expect(customsMap?.svg).toBe('<svg>Customs SVG</svg>');
      expect(woodsMap?.svg).toBeUndefined(); // No SVG in static data
    });

    it('merges unavailable message when available', async () => {
      const { useMapData } = await import('../useMapData');
      const { maps } = useMapData();

      const woodsMap = maps.value.find((m) => m.id === 'woods');
      expect(woodsMap?.unavailableMessage).toBe('Woods temporarily unavailable');
    });

    it('logs warning when static data is missing', async () => {
      // Add a map without static data
      mockQueryResult.value.maps.push(createMockMap('unknown-map', 'Unknown Map'));

      const { useMapData } = await import('../useMapData');
      const { maps } = useMapData();

      // Trigger computation
      maps.value;

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Static map data not found for map: Unknown Map (lookup key: unknownmap)'
      );
    });

    it('does not log warning when SVG is missing but unavailableMessage exists', async () => {
      const { useMapData } = await import('../useMapData');
      const { maps } = useMapData();

      // Trigger computation
      maps.value;

      // Woods has unavailableMessage, so no warning should be logged
      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        'Static SVG data not found for map: Woods (lookup key: woods)'
      );
    });

    it('works without static data', async () => {
      mockStaticMapDataRef.value = null;

      const { useMapData } = await import('../useMapData');
      const { maps } = useMapData();

      expect(maps.value).toHaveLength(5);
      expect(maps.value.every((m) => !m.svg && !m.unavailableMessage)).toBe(true);
    });

    it('returns empty array when query result is null', async () => {
      mockQueryResult.value = null;

      const { useMapData } = await import('../useMapData');
      const { maps } = useMapData();

      expect(maps.value).toEqual([]);
    });
  });

  describe('rawMaps computed property', () => {
    it('returns all maps without filtering or sorting', async () => {
      const { useMapData } = await import('../useMapData');
      const { rawMaps } = useMapData();

      expect(rawMaps.value).toHaveLength(8); // Includes variants
      expect(rawMaps.value.map((m) => m.name)).toContain('Night Factory');
      expect(rawMaps.value.map((m) => m.name)).toContain('Ground Zero 21+');
    });

    it('returns empty array when query result is null', async () => {
      mockQueryResult.value = null;

      const { useMapData } = await import('../useMapData');
      const { rawMaps } = useMapData();

      expect(rawMaps.value).toEqual([]);
    });
  });

  describe('mapsWithSvg computed property', () => {
    it('filters maps that have SVG data', async () => {
      const { useMapData } = await import('../useMapData');
      const { mapsWithSvg } = useMapData();

      expect(mapsWithSvg.value).toHaveLength(4); // Factory, Customs, Lab, Ground Zero
      expect(mapsWithSvg.value.every((m) => m.svg)).toBe(true);
      expect(mapsWithSvg.value.map((m) => m.name)).not.toContain('Woods');
    });
  });

  describe('mapsByAvailability computed property', () => {
    it('separates maps by SVG availability', async () => {
      const { useMapData } = await import('../useMapData');
      const { mapsByAvailability } = useMapData();

      expect(mapsByAvailability.value.withSvg).toHaveLength(4);
      expect(mapsByAvailability.value.withoutSvg).toHaveLength(1);

      expect(mapsByAvailability.value.withSvg.every((m) => m.svg)).toBe(true);
      expect(mapsByAvailability.value.withoutSvg.every((m) => !m.svg)).toBe(true);

      const withoutSvgNames = mapsByAvailability.value.withoutSvg.map((m) => m.name);
      expect(withoutSvgNames).toContain('Woods');
    });

    it('handles empty maps array', async () => {
      mockQueryResult.value.maps = [];

      const { useMapData } = await import('../useMapData');
      const { mapsByAvailability } = useMapData();

      expect(mapsByAvailability.value.withSvg).toHaveLength(0);
      expect(mapsByAvailability.value.withoutSvg).toHaveLength(0);
    });
  });

  describe('getMapById', () => {
    it('finds map by ID', async () => {
      const { useMapData } = await import('../useMapData');
      const { getMapById } = useMapData();

      const factory = getMapById('factory');
      expect(factory?.name).toBe('Factory');

      const missing = getMapById('nonexistent');
      expect(missing).toBeUndefined();
    });
  });

  describe('getMapByName', () => {
    it('finds map by name case insensitive', async () => {
      const { useMapData } = await import('../useMapData');
      const { getMapByName } = useMapData();

      const factory1 = getMapByName('Factory');
      const factory2 = getMapByName('factory');
      const factory3 = getMapByName('FACTORY');

      expect(factory1?.id).toBe('factory');
      expect(factory2?.id).toBe('factory');
      expect(factory3?.id).toBe('factory');
    });

    it('finds map by normalized name', async () => {
      const { useMapData } = await import('../useMapData');
      const { getMapByName } = useMapData();

      const customs = getMapByName('customs');
      expect(customs?.id).toBe('customs');
    });

    it('returns undefined for non-existent map', async () => {
      const { useMapData } = await import('../useMapData');
      const { getMapByName } = useMapData();

      const missing = getMapByName('Nonexistent Map');
      expect(missing).toBeUndefined();
    });
  });

  describe('getStaticMapKey', () => {
    it('maps special names correctly', async () => {
      const { useMapData } = await import('../useMapData');
      const { getStaticMapKey } = useMapData();

      expect(getStaticMapKey('Night Factory')).toBe('factory');
      expect(getStaticMapKey('The Lab')).toBe('lab');
      expect(getStaticMapKey('Ground Zero 21+')).toBe('groundzero');
      expect(getStaticMapKey('The Labyrinth')).toBe('labyrinth');
    });

    it('normalizes regular names', async () => {
      const { useMapData } = await import('../useMapData');
      const { getStaticMapKey } = useMapData();

      expect(getStaticMapKey('Customs')).toBe('customs');
      expect(getStaticMapKey('Streets of Tarkov')).toBe('streetsoftarkov');
      expect(getStaticMapKey('Reserve')).toBe('reserve');
    });

    it('handles special characters', async () => {
      const { useMapData } = await import('../useMapData');
      const { getStaticMapKey } = useMapData();

      expect(getStaticMapKey('Ground Zero+')).toBe('groundzero');
      expect(getStaticMapKey('Map with spaces')).toBe('mapwithspaces');
    });
  });

  describe('hasMapSvg', () => {
    it('returns true for maps with SVG', async () => {
      const { useMapData } = await import('../useMapData');
      const { hasMapSvg } = useMapData();

      expect(hasMapSvg('factory')).toBe(true);
      expect(hasMapSvg('customs')).toBe(true);
      expect(hasMapSvg('lab')).toBe(true);
    });

    it('returns false for maps without SVG', async () => {
      const { useMapData } = await import('../useMapData');
      const { hasMapSvg } = useMapData();

      expect(hasMapSvg('woods')).toBe(false);
    });

    it('returns false for non-existent maps', async () => {
      const { useMapData } = await import('../useMapData');
      const { hasMapSvg } = useMapData();

      expect(hasMapSvg('nonexistent')).toBe(false);
    });
  });

  describe('mapNameMapping export', () => {
    it('exposes the MAP_NAME_MAPPING constant', async () => {
      const { useMapData } = await import('../useMapData');
      const { mapNameMapping } = useMapData();

      expect(mapNameMapping).toEqual({
        'night factory': 'factory',
        'the lab': 'lab',
        'ground zero 21+': 'groundzero',
        'the labyrinth': 'labyrinth',
      });
    });
  });

  describe('warning sets isolation', () => {
    it('does not log duplicate warnings', async () => {
      // First computation should log warning
      mockStaticMapDataRef.value = {}; // Empty static data to trigger warnings

      const { useMapData } = await import('../useMapData');
      const { maps } = useMapData();

      maps.value; // Trigger computation

      expect(mockLogger.warn).toHaveBeenCalledTimes(5); // One for each map

      // Second computation should not log warnings again
      maps.value; // Trigger computation again

      expect(mockLogger.warn).toHaveBeenCalledTimes(5); // No additional warnings
    });

    it('handles empty query result gracefully', async () => {
      mockQueryResult.value = { maps: [] };

      const { useMapData } = await import('../useMapData');
      const { maps, mapsByAvailability, mapsWithSvg } = useMapData();

      expect(maps.value).toEqual([]);
      expect(mapsWithSvg.value).toEqual([]);
      expect(mapsByAvailability.value.withSvg).toEqual([]);
      expect(mapsByAvailability.value.withoutSvg).toEqual([]);
    });
  });
});
