import { ref, computed, watch, onMounted } from 'vue';
import { useQuery, provideApolloClient } from '@vue/apollo-composable';
import apolloClient from '@/plugins/apollo';
import tarkovDataQuery from '@/utils/tarkovdataquery';
import tarkovHideoutQuery from '@/utils/tarkovhideoutquery';
import languageQuery from '@/utils/languagequery';
import { useSafeLocale, extractLanguageCode } from '@/composables/utils/i18nHelpers';
import type {
  LanguageQueryResult,
  TarkovDataQueryResult,
  TarkovHideoutQueryResult,
  StaticMapData,
} from '@/types/tarkov';
import mapsData from './maps.json';
// Provide Apollo client
provideApolloClient(apolloClient);
// Singleton state for caching
const isInitialized = ref(false);
const availableLanguages = ref<string[] | null>(null);
const staticMapData = ref<StaticMapData | null>(null);
// Map data - now served locally
let mapPromise: Promise<StaticMapData> | null = null;
/**
 * Loads static map data from local source
 */
async function loadStaticMaps(): Promise<StaticMapData> {
  if (!mapPromise) {
    mapPromise = Promise.resolve(mapsData as StaticMapData);
  }
  return mapPromise;
}
// Language extraction moved to @/composables/utils/i18nHelpers.ts
/**
 * Composable for managing Tarkov API queries and language detection
 */
export function useTarkovApi() {
  // Use safe locale helper to avoid i18n context issues
  const locale = useSafeLocale();
  const languageCode = computed(() =>
    extractLanguageCode(locale.value, availableLanguages.value || ['en'])
  );
  // Load static map data on mount
  onMounted(async () => {
    if (!staticMapData.value) {
      staticMapData.value = await loadStaticMaps();
    }
  });
  // Initialize queries only once
  if (!isInitialized.value) {
    isInitialized.value = true;
    // Language Query - Get available languages
    const { onResult: onLanguageResult, onError: onLanguageError } = useQuery<LanguageQueryResult>(
      languageQuery,
      null,
      {
        fetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true,
        errorPolicy: 'all',
      }
    );
    onLanguageResult((result) => {
      availableLanguages.value = result.data?.__type?.enumValues.map(
        (enumValue) => enumValue.name
      ) ?? ['en'];
    });
    onLanguageError((error) => {
      console.error('Language query failed:', error);
      availableLanguages.value = ['en'];
    });
  }
  return {
    availableLanguages: availableLanguages,
    languageCode,
    staticMapData,
    loadStaticMaps,
  };
}
/**
 * Composable for Tarkov main data queries (tasks, maps, traders, player levels)
 */
export function useTarkovDataQuery() {
  // Get language code from the API composable to ensure consistency
  const { languageCode: apiLanguageCode } = useTarkovApi();
  const { result, error, loading, refetch } = useQuery<TarkovDataQueryResult, { lang: string }>(
    tarkovDataQuery,
    () => ({ lang: apiLanguageCode.value }),
    {
      fetchPolicy: 'cache-first',
      notifyOnNetworkStatusChange: true,
      errorPolicy: 'all',
      enabled: computed(() => !!availableLanguages.value),
    }
  );
  // Watch for language changes and refetch
  watch(apiLanguageCode, (newLang, oldLang) => {
    if (oldLang !== newLang && availableLanguages.value) {
      refetch({ lang: newLang });
    }
  });
  return {
    result,
    error,
    loading,
    refetch,
    languageCode: apiLanguageCode,
  };
}
/**
 * Composable for Tarkov hideout data queries
 */
export function useTarkovHideoutQuery() {
  // Get language code from the API composable to ensure consistency
  const { languageCode: apiLanguageCode } = useTarkovApi();
  const { result, error, loading, refetch } = useQuery<TarkovHideoutQueryResult, { lang: string }>(
    tarkovHideoutQuery,
    () => ({ lang: apiLanguageCode.value }),
    {
      fetchPolicy: 'cache-first',
      notifyOnNetworkStatusChange: true,
      errorPolicy: 'all',
      enabled: computed(() => !!availableLanguages.value),
    }
  );
  // Watch for language changes and refetch
  watch(apiLanguageCode, (newLang, oldLang) => {
    if (oldLang !== newLang && availableLanguages.value) {
      refetch({ lang: newLang });
    }
  });
  return {
    result,
    error,
    loading,
    refetch,
    languageCode: apiLanguageCode,
  };
}
