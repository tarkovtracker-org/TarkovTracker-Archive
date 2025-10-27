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

        <div v-if="!loading && !error" ref="scalarContainer">
          <ApiReference :configuration="scalarConfig" />
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
  import { onBeforeUnmount, onMounted, ref, computed, defineAsyncComponent, defineComponent, h } from 'vue';
  import '@scalar/api-reference/style.css';

  // Lazy load Scalar to keep it out of the main bundle
  const LoadingComponent = defineComponent({
    name: 'ApiReferenceLoading',
    setup() {
      return () =>
        h(
          'div',
          { class: 'd-flex justify-center align-center pa-8' },
          [h('v-progress-circular', { indeterminate: '', color: 'primary' })],
        );
    },
  });

  const ErrorComponent = defineComponent({
    name: 'ApiReferenceError',
    setup() {
      return () =>
        h(
          'div',
          { class: 'd-flex justify-center align-center pa-8' },
          [
            h('v-alert', {
              type: 'error',
              text: 'Failed to load API documentation',
            }),
          ],
        );
    },
  });

  const ApiReference = defineAsyncComponent({
    loader: () => import('@scalar/api-reference').then((module) => module.ApiReference),
    loadingComponent: LoadingComponent,
    errorComponent: ErrorComponent,
    delay: 200,
    timeout: 10000,
    onError(error, retry, _fail) {
      console.error('Failed to load ApiReference component:', error);
      retry(); // Retry once
    }
  });

  const loading = ref(true);
  const error = ref<string | null>(null);
  const fetchAbortController = ref<AbortController | null>(null);
  const fetchTimeoutId = ref<ReturnType<typeof setTimeout> | undefined>(undefined);
  const FETCH_TIMEOUT_MS = 15000;
  const specData = ref<Record<string, unknown> | null>(null);

  const handleAlertClose = () => {
    error.value = null;
  };

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
    customCss: `
      /* TarkovTracker Dark Theme */
      .scalar-api-reference {
        --scalar-font: 'Share Tech Mono', monospace;
        --scalar-font-code: 'Share Tech Mono', monospace;

        /* Primary colors */
        --scalar-color-1: #2ba86a;
        --scalar-color-2: #9a8866;
        --scalar-color-3: #2c261c;

        /* Background colors */
        --scalar-background-1: #121212;
        --scalar-background-2: #1e1e1e;
        --scalar-background-3: #2c261c;
        --scalar-background-4: #424242;

        /* Text colors */
        --scalar-color-accent: #2ba86a;
        --scalar-color-green: #2ba86a;
        --scalar-color-red: #cf6679;
        --scalar-color-yellow: #9a8866;
        --scalar-color-blue: #82aaff;
        --scalar-color-orange: #f78c6c;
        --scalar-color-purple: #c792ea;

        /* Border colors */
        --scalar-border-color: rgba(154, 136, 102, 0.3);
      }

      /* Ensure proper contrast for text */
      .scalar-api-reference * {
        font-family: 'Share Tech Mono', monospace;
      }

      /* Custom header styles to match TarkovTracker */
      .scalar-api-reference .scalar-card {
        background-color: #1e1e1e;
        border: 1px solid rgba(154, 136, 102, 0.3);
      }

      /* Method badges */
      .scalar-api-reference .scalar-method-get {
        background-color: #2ba86a;
        color: white;
      }

      .scalar-api-reference .scalar-method-post {
        background-color: #82aaff;
        color: white;
      }

      .scalar-api-reference .scalar-method-put {
        background-color: #f78c6c;
        color: white;
      }

      .scalar-api-reference .scalar-method-delete {
        background-color: #cf6679;
        color: white;
      }

      /* Scrollbar styling */
      .scalar-api-reference ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      .scalar-api-reference ::-webkit-scrollbar-track {
        background: #1e1e1e;
      }

      .scalar-api-reference ::-webkit-scrollbar-thumb {
        background: #9a8866;
        border-radius: 4px;
      }

      .scalar-api-reference ::-webkit-scrollbar-thumb:hover {
        background: #b89f7a;
      }
    `,
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
        console.warn('API docs request aborted');
        return;
      }
      error.value = err instanceof Error ? err.message : 'Failed to load API documentation';
      loading.value = false;
      console.error('Error loading API docs:', err);
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
