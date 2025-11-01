<template>
  <v-container fluid class="pa-0">
    <v-card flat color="transparent">
      <v-card-title
        class="d-flex align-center pa-6"
        style="background-color: #2c261c; border-bottom: 2px solid #9a8866"
      >
        <v-icon icon="mdi-api" size="large" class="mr-3" color="#9a8866" />
        <div>
          <div
            class="text-h4"
            style="color: rgba(255, 255, 255, 0.87); font-family: 'Share Tech Mono', monospace"
          >
            TarkovTracker API Documentation
          </div>
          <div
            class="text-subtitle-1 mt-1"
            style="color: rgba(255, 255, 255, 0.6); font-family: 'Share Tech Mono', monospace"
          >
            v2 REST API - Interactive Documentation & Playground
          </div>
        </div>
      </v-card-title>

      <v-card-text class="pa-0" style="background-color: transparent">
        <v-progress-linear v-if="loading" indeterminate color="primary" />

        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          class="ma-4"
          closable
          @click:close="handleAlertClose"
        >
          {{ error }}
        </v-alert>

        <div v-if="!loading && !error">
          <ApiReference :configuration="scalarConfig" />
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
  import { onBeforeUnmount, onMounted, ref, computed, defineAsyncComponent } from 'vue';
  import '@scalar/api-reference/style.css';
  import { LoadingComponent, ErrorComponent } from '@/pages/apiReferenceFallbackComponents';
  import { logger } from '@/utils/logger';

  const MAX_RETRIES = 2;

  const createApiReference = () => {
    let retryAttempts = 0;

    return defineAsyncComponent({
      loader: () => import('@scalar/api-reference').then((module) => module.ApiReference),
      loadingComponent: LoadingComponent,
      errorComponent: ErrorComponent,
      delay: 200,
      timeout: 10000,
      onError(error, retry, fail) {
        logger.error('Failed to load ApiReference component:', error);
        retryAttempts++;
        if (retryAttempts < MAX_RETRIES) {
          logger.info(
            `Retrying ApiReference load (attempt ${retryAttempts + 1}/${MAX_RETRIES})...`
          );
          retry();
        } else {
          logger.error('Max retries reached for ApiReference component');
          fail();
        }
      },
    });
  };

  const ApiReference = createApiReference();

  const loading = ref(true);
  const error = ref<string | null>(null);
  const fetchAbortController = ref<AbortController | null>(null);
  const fetchTimeoutId = ref<ReturnType<typeof setTimeout> | undefined>(undefined);
  const FETCH_TIMEOUT_MS = 15000;
  const specData = ref<Record<string, unknown> | null>(null);

  const handleAlertClose = () => {
    error.value = null;
  };

  // TarkovTracker custom CSS theme (empty for now)
  const TARKOV_TRACKER_THEME_CSS = '';

  // Scalar configuration with TarkovTracker theme
  const scalarConfig = computed(() => ({
    // Updated to latest Scalar API - remove spec wrapper
    content: specData.value,
    theme: 'none' as const, // Use 'none' to apply custom CSS
    darkMode: true,
    layout: 'modern' as const,
    defaultOpenAllTags: false,
    hideModels: false,
    showSidebar: true,
    customCss: TARKOV_TRACKER_THEME_CSS,
  }));

  onMounted(async () => {
    try {
      loading.value = true;
      const abortController = new AbortController();
      fetchAbortController.value = abortController;
      fetchTimeoutId.value = setTimeout(() => {
        abortController.abort();
      }, FETCH_TIMEOUT_MS);

      // Fetch OpenAPI spec
      const response = await fetch('/api/openapi.json', {
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to load API specification: ${response.statusText}`);
      }

      specData.value = await response.json();
      loading.value = false;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        loading.value = false;
        logger.warn('API docs request aborted');
        return;
      }
      error.value = err instanceof Error ? err.message : 'Failed to load API documentation';
      loading.value = false;
      logger.error('Error loading API docs:', err);
    } finally {
      if (fetchTimeoutId.value) {
        clearTimeout(fetchTimeoutId.value);
        fetchTimeoutId.value = undefined;
      }
      fetchAbortController.value = null;
    }
  });

  onBeforeUnmount(() => {
    fetchAbortController.value?.abort();
    fetchAbortController.value = null;
    if (fetchTimeoutId.value) {
      clearTimeout(fetchTimeoutId.value);
      fetchTimeoutId.value = undefined;
    }
  });
</script>

<style scoped>
  /* Additional component-level styles if needed */
  .scalar-api-reference {
    min-height: 600px;
  }
</style>
