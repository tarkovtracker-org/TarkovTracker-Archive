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
  variablesSource: ComputedRef<V>
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
      void startFetch(vars, controller);
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

export function useTarkovDataQuery(gameMode: ComputedRef<string> = computed(() => 'regular')) {
  const { languageCode } = useTarkovApi();

  const variables = computed(() => ({
    lang: languageCode.value,
    gameMode: gameMode.value,
  }));

  const { result, error, loading, refetch } = useGraphQLResource<
    TarkovDataQueryResult,
    { lang: string; gameMode: string }
  >(tarkovDataQuery, variables);

  return {
    result,
    error,
    loading,
    refetch,
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
