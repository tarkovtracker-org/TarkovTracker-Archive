import { createApp } from 'vue';
import type { ComponentPublicInstance } from 'vue'; // Import type for vm
import { DefaultApolloClient } from '@vue/apollo-composable';
import router from './router';
import i18n from './plugins/i18n';
import vuetify from './plugins/vuetify';
import pinia from './plugins/pinia';
import apolloClient from './plugins/apollo';
import { VueFire } from 'vuefire';
import { app as fireapp } from './plugins/firebase';
import { markInitialized } from './plugins/store-initializer';
import { markI18nReady } from '@/composables/utils/i18nHelpers';
import { usePrivacyConsent } from '@/composables/usePrivacyConsent';
import { logger } from '@/utils/logger';
// Base app component
import App from './App.vue';

// Define custom window property
declare global {
  interface Window {
    __TARKOV_DATA_MIGRATED?: boolean;
  }
}

// Add a global flag to track data migration status - will help with persistence
window.__TARKOV_DATA_MIGRATED = false;

// Create app instance
const app = createApp(App);

const { initializeConsent: initializePrivacyConsent } = usePrivacyConsent();
if (typeof window !== 'undefined') {
  initializePrivacyConsent();
}
// Global error handler for debugging
app.config.errorHandler = (err: unknown, vm: ComponentPublicInstance | null, info: string) => {
  logger.error('Vue Error:', err);
  logger.error('Component:', vm);
  logger.error('Info:', info);
};

// Configure app with plugins in the correct order
app.use(i18n);
// Mark i18n as ready for our composables
markI18nReady();

// Initialize Pinia and other plugins
app
  .use(pinia)
  .use(router)
  .use(vuetify)
  .use(VueFire, {
    firebaseApp: fireapp,
    modules: [],
  })
  .provide(DefaultApolloClient, apolloClient)
  .mount('#app');

// Mark the store system as initialized
markInitialized();
