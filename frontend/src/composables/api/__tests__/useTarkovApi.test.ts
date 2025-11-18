import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies
const mockExecuteGraphQL = vi.fn();
const mockFetchTarkovDevMaps = vi.fn();
const mockUseSafeLocale = vi.fn();
const mockExtractLanguageCode = vi.fn();

vi.mock('@/utils/graphqlClient', () => ({
  executeGraphQL: mockExecuteGraphQL,
}));

vi.mock('@/utils/mapTransformUtils', () => ({
  fetchTarkovDevMaps: mockFetchTarkovDevMaps,
}));

vi.mock('@/utils/languagequery', () => ({
  default: 'mock-language-query',
}));

vi.mock('@/utils/tarkovdataquery', () => ({
  default: 'mock-tarkov-data-query',
}));

vi.mock('@/utils/tarkovhideoutquery', () => ({
  default: 'mock-tarkov-hideout-query',
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/composables/utils/i18nHelpers', () => ({
  useSafeLocale: mockUseSafeLocale,
  extractLanguageCode: mockExtractLanguageCode,
}));

vi.mock('@/utils/constants', () => ({
  DEFAULT_LANGUAGE: 'en',
}));

describe('useTarkovApi Basic', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockUseSafeLocale.mockReturnValue({ value: 'en-US' });
    mockExtractLanguageCode.mockReturnValue('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should import successfully', async () => {
    const { useTarkovApi } = await import('../useTarkovApi');
    expect(typeof useTarkovApi).toBe('function');
  });

  it('should initialize with default values', async () => {
    mockExecuteGraphQL.mockResolvedValue({
      __type: {
        enumValues: [{ name: 'en' }, { name: 'ru' }],
      },
    });

    const { useTarkovApi } = await import('../useTarkovApi');
    const result = useTarkovApi();

    expect(result).toHaveProperty('availableLanguages');
    expect(result).toHaveProperty('languageCode');
    expect(result).toHaveProperty('staticMapData');
  });

  it('should handle language loading', async () => {
    mockExecuteGraphQL.mockResolvedValue({
      __type: {
        enumValues: [{ name: 'en' }, { name: 'ru' }, { name: 'de' }],
      },
    });

    const { useTarkovApi } = await import('../useTarkovApi');
    const { availableLanguages } = useTarkovApi();

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(availableLanguages.value).toBeDefined();
    expect(mockExecuteGraphQL).toHaveBeenCalledWith('mock-language-query');
  });

  it('should handle language loading errors', async () => {
    mockExecuteGraphQL.mockRejectedValue(new Error('Network error'));

    const { useTarkovApi } = await import('../useTarkovApi');
    const { availableLanguages } = useTarkovApi();

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(availableLanguages.value).toBeDefined();
    expect(mockExecuteGraphQL).toHaveBeenCalledWith('mock-language-query');
  });

  it('should compute language code correctly', async () => {
    mockUseSafeLocale.mockReturnValue({ value: 'fr-FR' });
    mockExtractLanguageCode.mockReturnValue('fr');

    const { useTarkovApi } = await import('../useTarkovApi');
    const { languageCode } = useTarkovApi();

    expect(languageCode.value).toBe('fr');
    expect(mockExtractLanguageCode).toHaveBeenCalledWith('fr-FR', null);
  });

  it('should extract language code with available languages', async () => {
    mockExecuteGraphQL.mockResolvedValue({
      __type: {
        enumValues: [{ name: 'en' }, { name: 'fr' }],
      },
    });

    const { useTarkovApi } = await import('../useTarkovApi');
    const { languageCode } = useTarkovApi();

    // Wait for language loading
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(languageCode.value).toBeDefined();
    mockUseSafeLocale.mockReturnValue({ value: 'fr-CA' });
    mockExtractLanguageCode.mockReturnValue('fr');

    expect(mockExtractLanguageCode).toHaveBeenCalledWith('fr-CA', ['en', 'fr']);
  });
});

describe('useTarkovDataQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteGraphQL.mockResolvedValue({
      maps: [],
      traders: [],
      playerLevels: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create query resource', async () => {
    const { useTarkovDataQuery } = await import('../useTarkovApi');

    // Create a simple computed game mode
    const gameMode = { value: 'regular' } as any;

    const result = useTarkovDataQuery(gameMode);

    expect(result).toHaveProperty('result');
    expect(result).toHaveProperty('loading');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('refetch');
  });

  it('should handle loading state', async () => {
    const { useTarkovDataQuery } = await import('../useTarkovApi');
    const gameMode = { value: 'regular' } as any;

    const { loading } = useTarkovDataQuery(gameMode);

    expect(typeof loading.value).toBe('boolean');
  });

  it('should handle error state', async () => {
    const { useTarkovDataQuery } = await import('../useTarkovApi');
    const gameMode = { value: 'regular' } as any;

    const { error } = useTarkovDataQuery(gameMode);

    expect(typeof error.value === 'object' || error.value === null).toBe(true);
  });
});

describe('useTarkovHideoutQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteGraphQL.mockResolvedValue({
      hideoutStations: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create hideout query resource', async () => {
    const { useTarkovHideoutQuery } = await import('../useTarkovApi');
    const gameMode = { value: 'regular' } as any;

    const result = useTarkovHideoutQuery(gameMode);

    expect(result).toHaveProperty('result');
    expect(result).toHaveProperty('loading');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('refetch');
  });

  it('should handle hideout loading state', async () => {
    const { useTarkovHideoutQuery } = await import('../useTarkovApi');
    const gameMode = { value: 'regular' } as any;

    const { loading } = useTarkovHideoutQuery(gameMode);

    expect(typeof loading.value).toBe('boolean');
  });
});

describe('loadStaticMaps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load fallback maps', async () => {
    const mockMapsData = {
      factory: { svg: '<svg>Factory</svg>' },
      customs: { svg: '<svg>Customs</svg>' },
    };

    vi.doMock('@/composables/api/maps.json', () => mockMapsData);

    const { loadStaticMaps } = await import('../useTarkovApi');

    const result = await loadStaticMaps();
    expect(result).toEqual(mockMapsData);
  });

  it('should handle fetch from tarkov.dev', async () => {
    const remoteMapsData = {
      factory: { svg: '<svg>Remote Factory</svg>' },
      woods: { svg: '<svg>Remote Woods</svg>' },
    };

    mockFetchTarkovDevMaps.mockResolvedValue(remoteMapsData);

    const mockMapsData = {
      factory: { svg: '<svg>Fallback Factory</svg>' },
    };

    vi.doMock('@/composables/api/maps.json', () => mockMapsData);

    const { loadStaticMaps } = await import('../useTarkovApi');

    const result = await loadStaticMaps();

    expect(result).toBeDefined();
    expect(mockFetchTarkovDevMaps).toHaveBeenCalled();
  });

  it('should handle background loading', async () => {
    const mockMapsData = {
      factory: { svg: '<svg>Factory</svg>' },
    };

    vi.doMock('@/composables/api/maps.json', () => mockMapsData);

    const { loadStaticMaps } = await import('../useTarkovApi');

    const result = await loadStaticMaps({ background: true });

    expect(result).toEqual(mockMapsData);
  });
});
