<template>
  <v-container fluid class="pa-0">
    <v-card flat>
      <v-card-title class="d-flex align-center bg-surface-variant pa-4">
        <v-icon icon="mdi-api" size="large" class="mr-3" />
        <div>
          <div class="text-h4">TarkovTracker API Documentation</div>
          <div class="text-subtitle-1 text-medium-emphasis mt-1">
            v2 REST API - Interactive Documentation & Playground
          </div>
        </div>
      </v-card-title>

      <v-card-text class="pa-0">
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

        <div id="swagger-ui" ref="swaggerContainer" />
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
  import { onBeforeUnmount, onMounted, ref } from 'vue';
  import SwaggerUIConstructor from 'swagger-ui';
  import 'swagger-ui/dist/swagger-ui.css';
  import '@/assets/styles/swagger-ui-theme.css';

  const swaggerContainer = ref<HTMLElement | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);
  type SwaggerUIInstance = ReturnType<typeof SwaggerUIConstructor> & { destroy?: () => void };
  const swaggerInstance = ref<SwaggerUIInstance | null>(null);
  const fetchAbortController = ref<AbortController | null>(null);
  const fetchTimeoutId = ref<ReturnType<typeof setTimeout> | undefined>(undefined);
  const FETCH_TIMEOUT_MS = 15000;

  const handleAlertClose = () => {
    error.value = null;
  };

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

      const spec = await response.json();
      const container = swaggerContainer.value;

      if (!container) {
        throw new Error('Swagger UI container is unavailable');
      }

      // Initialize Swagger UI
      swaggerInstance.value = SwaggerUIConstructor({
        spec,
        domNode: container,
        deepLinking: true,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: 'list',
        filter: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
      });

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
    if (swaggerInstance.value && typeof swaggerInstance.value.destroy === 'function') {
      swaggerInstance.value.destroy();
    }
    swaggerInstance.value = null;
  });
</script>
