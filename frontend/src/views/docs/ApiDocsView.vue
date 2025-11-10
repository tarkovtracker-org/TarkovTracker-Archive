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
  import { LoadingComponent, ErrorComponent } from '@/views/apiReferenceFallbackComponents';
  import { logger } from '@/utils/logger';
  const MAX_RETRIES = 2;
  const createApiReference = () => {
    const options = (() => {
      let retryAttempts = 0;
      return {
        loader: () => import('@scalar/api-reference').then((module) => module.ApiReference),
        loadingComponent: LoadingComponent,
        errorComponent: ErrorComponent,
        delay: 200,
        timeout: 10000,
        onError(error: unknown, retry: () => void, fail: () => void) {
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
      };
    })();
    return defineAsyncComponent(options);
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
  // TarkovTracker custom CSS theme for Scalar API documentation
  // Matches the application's dark theme with custom colors
  const TARKOV_TRACKER_THEME_CSS = `
    /* Scalar API Documentation - TarkovTracker Theme */
    :root {
      /* Primary colors matching TarkovTracker theme */
      --scalar-primary: #0A0A09;
      --scalar-primary-light: #1a1a19;
      --scalar-secondary: #9A8866;
      --scalar-secondary-light: #b8a885;
      --scalar-accent: #242F35;
      --scalar-accent-light: #344045;
      --scalar-success: #2BA86A;
      --scalar-warning: #391111;
      --scalar-error: #FF0000;
      --scalar-info: #181817;
      
      /* Surface colors */
      --scalar-surface: #1E1E1E;
      --scalar-surface-variant: #2a2a2a;
      --scalar-background: #121212;
      --scalar-card: #242424;
      
      /* Text colors */
      --scalar-on-primary: #ffffff;
      --scalar-on-surface: #e0e0e0;
      --scalar-on-background: #ffffff;
      --scalar-text-primary: #ffffff;
      --scalar-text-secondary: #b0b0b0;
      --scalar-text-muted: #808080;
      
      /* Border and divider colors */
      --scalar-border: #333333;
      --scalar-divider: #404040;
      
      /* Code blocks */
      --scalar-code-bg: #1a1a1a;
      --scalar-code-text: #e83e8c;
      
      /* API method colors */
      --scalar-get: #2BA86A;
      --scalar-post: #248F52;
      --scalar-put: #C76A1F;
      --scalar-delete: #FF0000;
      --scalar-patch: #FF8C5A;
      --scalar-head: #5BA9FF;
      --scalar-options: #9A8866;
    }
    
    /* Dark theme overrides */
    .scalar-api-reference {
      background-color: var(--scalar-background);
      color: var(--scalar-on-background);
    }
    
    .scalar-api-reference .scalar-card {
      background-color: var(--scalar-card);
      border: 1px solid var(--scalar-border);
      border-radius: 8px;
    }
    
    .scalar-api-reference .scalar-header {
      background-color: var(--scalar-surface);
      border-bottom: 1px solid var(--scalar-border);
    }
    
    .scalar-api-reference .scalar-sidebar {
      background-color: var(--scalar-surface);
      border-right: 1px solid var(--scalar-border);
    }
    
    /* Typography */
    .scalar-api-reference h1,
    .scalar-api-reference h2,
    .scalar-api-reference h3,
    .scalar-api-reference h4,
    .scalar-api-reference h5,
    .scalar-api-reference h6 {
      color: var(--scalar-text-primary);
    }
    
    .scalar-api-reference p,
    .scalar-api-reference .scalar-description {
      color: var(--scalar-text-secondary);
    }
    
    /* Code styling */
    .scalar-api-reference code {
      background-color: var(--scalar-code-bg);
      color: var(--scalar-code-text);
      padding: 2px 4px;
      border-radius: 4px;
      font-family: 'Share Tech Mono', monospace;
    }
    
    .scalar-api-reference pre {
      background-color: var(--scalar-code-bg);
      border: 1px solid var(--scalar-border);
      border-radius: 6px;
      padding: 16px;
      overflow-x: auto;
    }
    
    .scalar-api-reference pre code {
      background: none;
      padding: 0;
    }
    
    /* API method styling */
    .scalar-api-reference .scalar-method--get {
      color: var(--scalar-get);
      background-color: rgba(43, 168, 106, 0.1);
      border: 1px solid var(--scalar-get);
    }
    
    .scalar-api-reference .scalar-method--post {
      color: var(--scalar-post);
      background-color: rgba(36, 143, 82, 0.1);
      border: 1px solid var(--scalar-post);
    }
    
    .scalar-api-reference .scalar-method--put {
      color: var(--scalar-put);
      background-color: rgba(199, 106, 31, 0.1);
      border: 1px solid var(--scalar-put);
    }
    
    .scalar-api-reference .scalar-method--delete {
      color: var(--scalar-delete);
      background-color: rgba(255, 0, 0, 0.1);
      border: 1px solid var(--scalar-delete);
    }
    
    .scalar-api-reference .scalar-method--patch {
      color: var(--scalar-patch);
      background-color: rgba(255, 140, 90, 0.1);
      border: 1px solid var(--scalar-patch);
    }
    
    /* Buttons and interactive elements */
    .scalar-api-reference .scalar-button {
      background-color: var(--scalar-primary);
      color: var(--scalar-on-primary);
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    
    .scalar-api-reference .scalar-button:hover {
      background-color: var(--scalar-primary-light);
    }
    
    /* Tables */
    .scalar-api-reference table {
      background-color: var(--scalar-surface);
      border: 1px solid var(--scalar-border);
    }
    
    .scalar-api-reference th,
    .scalar-api-reference td {
      border-bottom: 1px solid var(--scalar-divider);
      color: var(--scalar-text-secondary);
    }
    
    .scalar-api-reference th {
      background-color: var(--scalar-surface-variant);
      color: var(--scalar-text-primary);
    }
    
    /* Links */
    .scalar-api-reference a {
      color: var(--scalar-secondary);
      text-decoration: none;
    }
    
    .scalar-api-reference a:hover {
      color: var(--scalar-secondary-light);
      text-decoration: underline;
    }
    
    /* Scrollbar styling */
    .scalar-api-reference ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    .scalar-api-reference ::-webkit-scrollbar-track {
      background: var(--scalar-surface);
    }
    
    .scalar-api-reference ::-webkit-scrollbar-thumb {
      background: var(--scalar-border);
      border-radius: 4px;
    }
    
    .scalar-api-reference ::-webkit-scrollbar-thumb:hover {
      background: var(--scalar-divider);
    }
  `;
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
