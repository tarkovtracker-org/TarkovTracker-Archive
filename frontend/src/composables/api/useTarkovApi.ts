import { computed, effectScope, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue';
import { executeGraphQL, queryToString } from '@/utils/graphqlClient';
import { fetchTarkovDevMaps } from '@/utils/mapTransformUtils';
import languageQuery from '@/utils/languagequery';
import tarkovDataQuery from '@/utils/tarkovdataquery';
import tarkovHideoutQuery from '@/utils/tarkovhideoutquery';
import { logger } from '@/utils/logger';
import { LRUCache } from '@/utils/lruCache';
import { useSafeLocale, extractLanguageCode } from '@/composables/utils/i18nHelpers';
import { DEFAULT_LANGUAGE } from '@/utils/constants';
import type {
  LanguageQueryResult,
  StaticMapData,
  TarkovDataQueryResult,
  TarkovHideoutQueryResult,
} from '@/types/models/tarkov';
const TARKOV_DATA_CACHE_PREFIX = 'tt:tarkov-data:';
const DEFAULT_TARKOV_DATA_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const TARKOV_DATA_CACHE_TTL_MS = (() => {
  const rawValue = import.meta.env?.VITE_TARKOV_DATA_CACHE_TTL_MS;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TARKOV_DATA_CACHE_TTL_MS;
})();
const TARKOV_DATA_RESOURCE_CACHE_SIZE = 6;
interface TarkovDataCachePayload {
  timestamp: number;
  data: TarkovDataQueryResult;
}
const inMemoryTarkovDataCache = new Map<string, TarkovDataCachePayload>();
interface TarkovDataCacheRecord extends TarkovDataCachePayload {
  key: string;
}
interface ResourceCacheEntry<T> {
  data: T;
  stale?: boolean;
}
interface ResourceCacheOptions<T, V> {
  hydrate?: (variables: V) => ResourceCacheEntry<T> | Promise<ResourceCacheEntry<T> | null> | null;
  persist?: (variables: V, data: T) => void | Promise<void>;
}
interface GraphQLResource<T, V extends Record<string, unknown>> {
  result: Ref<T | null>;
  error: Ref<Error | null>;
  loading: Ref<boolean>;
  refetch: (override?: Partial<V>) => Promise<void>;
  cleanup: () => void;
}
type TarkovDataVariables = { lang: string; gameMode: string };
type HideoutVariables = { gameMode: string; languageCode: string };
const tarkovDataQueryResources = new LRUCache<
  string,
  GraphQLResource<TarkovDataQueryResult, TarkovDataVariables>
>(TARKOV_DATA_RESOURCE_CACHE_SIZE, (_key, resource) => {
  resource.cleanup();
});
let tarkovDataDbPromise: Promise<IDBDatabase | null> | null = null;
const MAX_DB_RETRIES = 3;
const DB_RETRY_BACKOFF_MS = 200;
function openTarkovDataDbOnce(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open('tt-cache', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('tarkovData')) {
        db.createObjectStore('tarkovData', { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}
async function getTarkovDataDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
    return null;
  }
  if (!tarkovDataDbPromise) {
    tarkovDataDbPromise = (async () => {
      for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
        try {
          return await openTarkovDataDbOnce();
        } catch (error) {
          if (attempt === MAX_DB_RETRIES) {
            logger.warn(`Failed to open IndexedDB after ${MAX_DB_RETRIES} attempts:`, error);
            tarkovDataDbPromise = Promise.resolve(null);
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, DB_RETRY_BACKOFF_MS * attempt));
        }
      }
      return null;
    })();
  }
  return tarkovDataDbPromise;
}
function resolveTarkovDataCacheKey(variables: TarkovDataVariables): string {
  // Deterministic cache key by concatenating normalized values
  return `${TARKOV_DATA_CACHE_PREFIX}${variables.gameMode}:${variables.lang}`;
}
async function loadTarkovDataCache(key: string): Promise<TarkovDataCachePayload | null> {
  if (inMemoryTarkovDataCache.has(key)) {
    return inMemoryTarkovDataCache.get(key) ?? null;
  }
  const db = await getTarkovDataDb();
  if (!db) {
    return null;
  }
  return await new Promise<TarkovDataCachePayload | null>((resolve) => {
    const tx = db.transaction('tarkovData', 'readonly');
    const store = tx.objectStore('tarkovData');
    const request = store.get(key);
    request.onsuccess = () => {
      const record = (request.result as TarkovDataCacheRecord | undefined) ?? null;
      if (record) {
        const payload: TarkovDataCachePayload = record;
        inMemoryTarkovDataCache.set(key, payload);
        resolve(payload);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => {
      logger.warn('Failed to read cached Tarkov data:', request.error);
      resolve(null);
    };
  });
}
async function writeTarkovDataCache(key: string, payload: TarkovDataCachePayload): Promise<void> {
  inMemoryTarkovDataCache.set(key, payload);
  const db = await getTarkovDataDb();
  if (!db) {
    return;
  }
  await new Promise<void>((resolve) => {
    const tx = db.transaction('tarkovData', 'readwrite');
    const store = tx.objectStore('tarkovData');
    const record: TarkovDataCacheRecord = { key, ...payload };
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      logger.warn('Failed to persist Tarkov data cache entry:', request.error);
      resolve();
    };
  });
}
const availableLanguages = ref<string[] | null>(null);
const staticMapData = ref<StaticMapData | null>(null);
let languageFetchPromise: Promise<void> | null = null;
let remoteMapPromise: Promise<StaticMapData> | null = null;
let fallbackMapPromise: Promise<StaticMapData> | null = null;
async function loadFallbackMaps(): Promise<StaticMapData> {
  if (!fallbackMapPromise) {
    fallbackMapPromise = import('./maps.json').then((module) => module.default as StaticMapData);
  }
  return fallbackMapPromise;
}
let apiInitPromise: Promise<void> | null = null;
async function hydrateTarkovDataResource(
  vars: TarkovDataVariables
): Promise<ResourceCacheEntry<TarkovDataQueryResult> | null> {
  const key = resolveTarkovDataCacheKey(vars);
  const cached = await loadTarkovDataCache(key);
  if (!cached) {
    return null;
  }
  const stale = Date.now() - cached.timestamp > TARKOV_DATA_CACHE_TTL_MS;
  return { data: cached.data, stale };
}
async function persistTarkovDataResource(
  vars: TarkovDataVariables,
  data: TarkovDataQueryResult
): Promise<void> {
  const key = resolveTarkovDataCacheKey(vars);
  await writeTarkovDataCache(key, { timestamp: Date.now(), data });
}
function createTarkovDataResource(
  lang: string,
  gameMode: string
): GraphQLResource<TarkovDataQueryResult, TarkovDataVariables> {
  const scope = effectScope(true);
  const resource = scope.run(() => {
    const variables = computed<TarkovDataVariables>(() => ({
      lang,
      gameMode,
    }));
    return useGraphQLResource<TarkovDataQueryResult, TarkovDataVariables>(
      tarkovDataQuery,
      variables,
      {
        hydrate: hydrateTarkovDataResource,
        persist: persistTarkovDataResource,
      }
    );
  });
  if (!resource) {
    scope.stop();
    throw new Error('Failed to create Tarkov data resource');
  }
  const originalCleanup = resource.cleanup;
  return {
    ...resource,
    cleanup: () => {
      originalCleanup();
      scope.stop();
    },
  };
}
function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error('Unknown error');
  }
}
async function ensureAvailableLanguages(): Promise<void> {
  if (languageFetchPromise) {
    return languageFetchPromise;
  }
  languageFetchPromise = (async () => {
    try {
      const data = await executeGraphQL<LanguageQueryResult>(languageQuery);
      const languages = data.__type?.enumValues?.map((enumValue) => enumValue.name) ?? [
        DEFAULT_LANGUAGE,
      ];
      availableLanguages.value = languages;
    } catch (error) {
      logger.error('Language query failed:', error);
      availableLanguages.value = [DEFAULT_LANGUAGE];
      languageFetchPromise = Promise.resolve();
      return languageFetchPromise;
    }
  })();
  return languageFetchPromise;
}
async function ensureFallbackStaticMaps(): Promise<StaticMapData> {
  if (staticMapData.value) {
    return staticMapData.value;
  }
  const fallbackData = await loadFallbackMaps();
  staticMapData.value = fallbackData;
  return fallbackData;
}
async function startRemoteMapFetch(forceRefresh = false): Promise<StaticMapData> {
  if (forceRefresh) {
    remoteMapPromise = null;
  }
  if (!remoteMapPromise) {
    remoteMapPromise = fetchTarkovDevMaps()
      .then((data) => {
        staticMapData.value = data;
        return data;
      })
      .catch(async (error) => {
        logger.warn('Failed to fetch maps from tarkov.dev, continuing with fallback data:', error);
        return staticMapData.value ?? (await ensureFallbackStaticMaps());
      });
  }
  return remoteMapPromise;
}
async function loadStaticMaps(options?: { background?: boolean; forceRefresh?: boolean }) {
  await ensureFallbackStaticMaps();
  if (options?.background) {
    void startRemoteMapFetch(options.forceRefresh ?? false);
    return staticMapData.value as StaticMapData;
  }
  return startRemoteMapFetch(options?.forceRefresh ?? false);
}
function useGraphQLResource<T, V extends Record<string, unknown>>(
  query: string | import('graphql').DocumentNode,
  variablesSource: ComputedRef<V>,
  cacheOptions?: ResourceCacheOptions<T, V>
) {
  const result = ref<T | null>(null);
  const error = ref<Error | null>(null);
  const loading = ref(false);
  let activeController: AbortController | null = null;
  let latestFetchId = 0;
  const startFetch = (variables: V, existingController?: AbortController) => {
    const controller = existingController ?? new AbortController();
    const previousController = activeController;
    activeController = controller;
    if (previousController && previousController !== controller) {
      previousController.abort();
    }
    const fetchId = ++latestFetchId;
    loading.value = true;
    // Convert query to string for execution
    const queryString = typeof query === 'string' ? query : queryToString(query);
    const promise = executeGraphQL<T, V>(queryString, variables, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted || fetchId !== latestFetchId) {
          return;
        }
        result.value = data;
        error.value = null;
        const persistResult = cacheOptions?.persist?.(variables, data);
        if (persistResult instanceof Promise) {
          persistResult.catch((persistError) => {
            logger.warn('Failed to persist Tarkov data cache entry:', persistError);
          });
        }
      })
      .catch((err) => {
        if (controller.signal.aborted || fetchId !== latestFetchId) {
          return;
        }
        error.value = normalizeError(err);
      })
      .finally(() => {
        if (controller.signal.aborted || fetchId !== latestFetchId) {
          return;
        }
        if (activeController === controller) {
          activeController = null;
        }
        loading.value = false;
      });
    return promise;
  };
  const stopWatch = watch(
    variablesSource,
    (vars, _prev, onCleanup) => {
      const controller = new AbortController();
      const run = async () => {
        try {
          const cacheEntry =
            cacheOptions?.hydrate !== undefined ? await cacheOptions.hydrate(vars) : null;
          if (controller.signal.aborted) {
            return;
          }
          if (cacheEntry?.data) {
            result.value = cacheEntry.data;
            error.value = null;
            if (cacheEntry.stale === false) {
              loading.value = false;
              return;
            }
            loading.value = true;
          }
          await startFetch(vars, controller);
        } catch (err) {
          if (controller.signal.aborted) {
            return;
          }
          error.value = normalizeError(err);
          loading.value = false;
        }
      };
      void run();
      onCleanup(() => controller.abort());
    },
    { immediate: true }
  );
  const refetch = async (override?: Partial<V>) => {
    const merged = { ...variablesSource.value, ...override } as V;
    await startFetch(merged);
  };
  const cleanup = () => {
    stopWatch();
    activeController?.abort();
  };
  return { result, error, loading, refetch, cleanup } as const;
}
export function useTarkovApi() {
  if (!apiInitPromise) {
    apiInitPromise = ensureAvailableLanguages().catch((error) => {
      logger.error('Failed to initialize available languages:', error);
    });
  }
  const locale = useSafeLocale();
  const languageCode = computed(() =>
    extractLanguageCode(locale.value, availableLanguages.value || [DEFAULT_LANGUAGE])
  );
  onMounted(async () => {
    await apiInitPromise;
    void loadStaticMaps({ background: true });
  });
  return {
    availableLanguages,
    languageCode,
    staticMapData,
    loadStaticMaps,
  } as const;
}
// LRU cache to store hideout query resources keyed by variables (gameMode + languageCode)
// Limited to 10 entries to prevent unbounded growth; evicts least recently used entries
// and properly cleans up watchers/subscriptions to prevent memory leaks
const hideoutQueryResources = new LRUCache<
  string,
  GraphQLResource<TarkovHideoutQueryResult, HideoutVariables>
>(10, (_key, resource) => {
  // Cleanup function called when a resource is evicted from the cache
  // This stops the watcher and aborts any active fetch controllers
  resource.cleanup();
});
export function useTarkovDataQuery(gameMode: ComputedRef<string> = computed(() => 'regular')) {
  const { languageCode } = useTarkovApi();
  const currentResource = computed(() => {
    const lang = languageCode.value;
    const mode = gameMode.value;
    const key = `${lang}:${mode}`;
    const existing = tarkovDataQueryResources.get(key);
    if (existing) {
      return existing;
    }
    const resource = createTarkovDataResource(lang, mode);
    tarkovDataQueryResources.set(key, resource);
    return resource;
  });
  const result = computed<TarkovDataQueryResult | null>(() => {
    const resource = currentResource.value;
    return resource.result.value;
  });
  const error = computed<Error | null>(() => {
    const resource = currentResource.value;
    return resource.error.value;
  });
  const loading = computed<boolean>(() => {
    const resource = currentResource.value;
    return resource.loading.value;
  });
  const refetch = (override?: Partial<TarkovDataVariables>) => {
    const resource = currentResource.value;
    return resource.refetch(override);
  };
  return {
    result,
    error,
    loading,
    refetch,
    languageCode,
    gameMode,
  };
}
export function useTarkovHideoutQuery(gameMode: ComputedRef<string> = computed(() => 'regular')): {
  result: ComputedRef<TarkovHideoutQueryResult | null>;
  error: ComputedRef<Error | null>;
  loading: ComputedRef<boolean>;
  refetch: (override?: Partial<HideoutVariables>) => void;
  languageCode: ComputedRef<string>;
  gameMode: ComputedRef<string>;
} {
  const { languageCode } = useTarkovApi();
  // Computed variables that include both gameMode and languageCode
  // This ensures both reactive values are considered together for resource selection
  const variables = computed(() => ({
    gameMode: gameMode.value,
    languageCode: languageCode.value,
  }));
  // Serialize variables into a stable key for Map lookup
  // Uses deterministic order to ensure consistent key generation
  const resourceKey = computed(() => {
    const { gameMode, languageCode } = variables.value;
    return JSON.stringify({ languageCode, gameMode });
  });
  // Get or create the appropriate resource for the current variables
  const currentResource = computed(() => {
    const key = resourceKey.value;
    // Return existing resource if available
    const existing = hideoutQueryResources.get(key);
    if (existing) {
      return existing;
    }
    // Create new resource for this unique combination and store it
    const newResource = useGraphQLResource<TarkovHideoutQueryResult, HideoutVariables>(
      tarkovHideoutQuery,
      variables
    );
    hideoutQueryResources.set(key, newResource);
    return newResource;
  });
  const result = computed<TarkovHideoutQueryResult | null>(() => {
    const resource = currentResource.value;
    return resource.result.value;
  });
  const error = computed<Error | null>(() => {
    const resource = currentResource.value;
    return resource.error.value;
  });
  const loading = computed<boolean>(() => {
    const resource = currentResource.value;
    return resource.loading.value;
  });
  const refetch = (override?: Partial<HideoutVariables>) => {
    const resource = currentResource.value;
    return resource.refetch(override);
  };
  return {
    result,
    error,
    loading,
    refetch,
    languageCode,
    gameMode,
  };
}
export { loadStaticMaps };
