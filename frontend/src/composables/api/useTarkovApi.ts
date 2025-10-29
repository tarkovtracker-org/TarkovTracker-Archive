import { computed, onMounted, ref, watch, type ComputedRef } from 'vue';
import tarkovDataQuery from '@/utils/tarkovdataquery';
import tarkovHideoutQuery from '@/utils/tarkovhideoutquery';
import languageQuery from '@/utils/languagequery';
import { useSafeLocale, extractLanguageCode } from '@/composables/utils/i18nHelpers';
import type {
  LanguageQueryResult,
  StaticMapData,
  TarkovDataQueryResult,
  TarkovHideoutQueryResult,
} from '@/types/tarkov';
import { fetchTarkovDevMaps } from '@/utils/mapTransformUtils';
import { executeGraphQL, queryToString } from '@/utils/graphqlClient';
import { logger } from '@/utils/logger';
import fallbackMapsData from './maps.json';

const TARKOV_DATA_CACHE_PREFIX = 'tt:tarkov-data:';
const TARKOV_DATA_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

interface TarkovDataCachePayload {
  timestamp: number;
  data: TarkovDataQueryResult;
}

const inMemoryTarkovDataCache = new Map<string, TarkovDataCachePayload>();
interface TarkovDataCacheRecord extends TarkovDataCachePayload {
  key: string;
}

let tarkovDataDbPromise: Promise<IDBDatabase | null> | null = null;

async function getTarkovDataDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
    return null;
  }
  if (!tarkovDataDbPromise) {
    tarkovDataDbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open('tt-cache', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('tarkovData')) {
          db.createObjectStore('tarkovData', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    })
      .catch((error) => {
        logger.warn('Failed to open IndexedDB for Tarkov cache:', error);
        return null;
      })
      .finally(() => {
        // no-op
      });
  }
  return tarkovDataDbPromise;
}

function resolveTarkovDataCacheKey(variables: TarkovDataVariables): string {
  return `${TARKOV_DATA_CACHE_PREFIX}${variables.lang}:${variables.gameMode}`;
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
        const payload: TarkovDataCachePayload = {
          timestamp: record.timestamp,
          data: record.data,
        };
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

interface ResourceCacheEntry<T> {
  data: T;
  stale?: boolean;
}

interface ResourceCacheOptions<T, V> {
  hydrate?: (variables: V) => ResourceCacheEntry<T> | Promise<ResourceCacheEntry<T> | null> | null;
  persist?: (variables: V, data: T) => void | Promise<void>;
}

type TarkovDataVariables = { lang: string; gameMode: string };
type GraphQLResource<T, V extends Record<string, unknown>> = ReturnType<
  typeof useGraphQLResource<T, V>
>;
type SharedTarkovDataResource = GraphQLResource<TarkovDataQueryResult, TarkovDataVariables>;

const availableLanguages = ref<string[] | null>(null);
const staticMapData = ref<StaticMapData | null>(null);

let languageFetchPromise: Promise<void> | null = null;
let mapPromise: Promise<StaticMapData> | null = null;
let apiInitialized = false;

const DEFAULT_LANGUAGE = 'en';

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
    }
  })();

  return languageFetchPromise;
}

async function loadStaticMaps(): Promise<StaticMapData> {
  if (!mapPromise) {
    mapPromise = fetchTarkovDevMaps().catch((error) => {
      logger.warn('Failed to fetch maps from tarkov.dev, using fallback data:', error);
      return fallbackMapsData as StaticMapData;
    });
  }
  return mapPromise;
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

  const startFetch = (variables: V, existingController?: AbortController) => {
    activeController?.abort();
    const controller = existingController ?? new AbortController();
    activeController = controller;
    loading.value = true;

    // Convert query to string for execution
    const queryString = typeof query === 'string' ? query : queryToString(query);
    const promise = executeGraphQL<T, V>(queryString, variables, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) {
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
        if (controller.signal.aborted) {
          return;
        }
        error.value = normalizeError(err);
      })
      .finally(() => {
        if (controller.signal.aborted) {
          return;
        }
        if (activeController === controller) {
          activeController = null;
        }
        loading.value = false;
      });

    return promise;
  };

  watch(
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
    { immediate: true, deep: true }
  );

  const refetch = async (override?: Partial<V>) => {
    const merged = { ...variablesSource.value, ...override } as V;
    await startFetch(merged);
  };

  return { result, error, loading, refetch } as const;
}

export function useTarkovApi() {
  if (!apiInitialized) {
    apiInitialized = true;
    void ensureAvailableLanguages();
  }

  const locale = useSafeLocale();
  const languageCode = computed(() =>
    extractLanguageCode(locale.value, availableLanguages.value || [DEFAULT_LANGUAGE])
  );

  onMounted(async () => {
    if (!staticMapData.value) {
      staticMapData.value = await loadStaticMaps();
    }
  });

  return {
    availableLanguages,
    languageCode,
    staticMapData,
    loadStaticMaps,
  } as const;
}

let sharedTarkovDataQueryResource: SharedTarkovDataResource | null = null;

export function useTarkovDataQuery(gameMode: ComputedRef<string> = computed(() => 'regular')) {
  const { languageCode } = useTarkovApi();

  const variables = computed<TarkovDataVariables>(() => ({
    lang: languageCode.value,
    gameMode: gameMode.value,
  }));

  if (!sharedTarkovDataQueryResource) {
    const hydrate = async (
      vars: TarkovDataVariables
    ): Promise<ResourceCacheEntry<TarkovDataQueryResult> | null> => {
      const key = resolveTarkovDataCacheKey(vars);
      const cached = await loadTarkovDataCache(key);
      if (!cached) {
        return null;
      }
      const stale = Date.now() - cached.timestamp > TARKOV_DATA_CACHE_TTL_MS;
      return { data: cached.data, stale };
    };
    const persist = async (vars: TarkovDataVariables, data: TarkovDataQueryResult) => {
      const key = resolveTarkovDataCacheKey(vars);
      await writeTarkovDataCache(key, { timestamp: Date.now(), data });
    };

    sharedTarkovDataQueryResource = useGraphQLResource<TarkovDataQueryResult, TarkovDataVariables>(
      tarkovDataQuery,
      variables,
      { hydrate, persist }
    );
  }

  return {
    result: sharedTarkovDataQueryResource.result,
    error: sharedTarkovDataQueryResource.error,
    loading: sharedTarkovDataQueryResource.loading,
    refetch: sharedTarkovDataQueryResource.refetch,
    languageCode,
    gameMode,
  } as const;
}

export function useTarkovHideoutQuery(gameMode: ComputedRef<string> = computed(() => 'regular')) {
  const { languageCode } = useTarkovApi();

  const variables = computed(() => ({
    gameMode: gameMode.value,
  }));

  const { result, error, loading, refetch } = useGraphQLResource<
    TarkovHideoutQueryResult,
    { gameMode: string }
  >(tarkovHideoutQuery, variables);

  const refetchWithLanguage = async () => {
    await refetch();
  };

  watch(languageCode, () => {
    void refetchWithLanguage();
  });

  return {
    result,
    error,
    loading,
    refetch: refetchWithLanguage,
    languageCode,
    gameMode,
  } as const;
}

export { loadStaticMaps };
