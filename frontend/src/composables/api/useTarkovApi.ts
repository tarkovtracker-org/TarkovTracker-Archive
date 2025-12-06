import { ref, computed, watch, onMounted, type ComputedRef } from 'vue';
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
import { logger } from '@/utils/logger';
provideApolloClient(apolloClient);
// Singleton state for caching
const isInitialized = ref(false);
const availableLanguages = ref<string[] | null>(null);
const staticMapData = ref<StaticMapData | null>(null);
// Map data - now served locally
let mapPromise: Promise<StaticMapData> | null = null;
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
      logger.error('Language query failed:', error);
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
export function useTarkovDataQuery(gameMode: ComputedRef<string> = computed(() => 'regular')) {
  // Get language code from the API composable to ensure consistency
  const { languageCode: apiLanguageCode } = useTarkovApi();
  const { result, error, loading, refetch } = useQuery<
    TarkovDataQueryResult,
    { lang: string; gameMode: string }
  >(tarkovDataQuery, () => ({ lang: apiLanguageCode.value, gameMode: gameMode.value }), {
    fetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'all',
    // Allow query to execute immediately, don't wait for availableLanguages
    // The languageCode computed will default to 'en' if languages aren't loaded yet
  });
  // Watch for language and gameMode changes and refetch
  watch([apiLanguageCode, gameMode], ([newLang, newGameMode], [oldLang, oldGameMode]) => {
    if ((oldLang !== newLang || oldGameMode !== newGameMode) && availableLanguages.value) {
      refetch({ lang: newLang, gameMode: newGameMode });
    }
  });
  return {
    result,
    error,
    loading,
    refetch,
    languageCode: apiLanguageCode,
    gameMode,
  };
}
/**
 * Composable for Tarkov hideout data queries
 */
export function useTarkovHideoutQuery(gameMode: ComputedRef<string> = computed(() => 'regular')) {
  // Get language code from the API composable to ensure consistency
  const { languageCode: apiLanguageCode } = useTarkovApi();
  const { result, error, loading, refetch } = useQuery<
    TarkovHideoutQueryResult,
    { lang: string; gameMode: string }
  >(tarkovHideoutQuery, () => ({ lang: apiLanguageCode.value, gameMode: gameMode.value }), {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'all',
    // Allow query to execute immediately, don't wait for availableLanguages
    // The languageCode computed will default to 'en' if languages aren't loaded yet
  });
  // Watch for language and gameMode changes and refetch
  watch([apiLanguageCode, gameMode], ([newLang, newGameMode], [oldLang, oldGameMode]) => {
    if ((oldLang !== newLang || oldGameMode !== newGameMode) && availableLanguages.value) {
      refetch({ lang: newLang, gameMode: newGameMode });
    }
  });
  return {
    result,
    error,
    loading,
    refetch,
    languageCode: apiLanguageCode,
    gameMode,
  };
}
