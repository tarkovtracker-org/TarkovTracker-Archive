<template>
  <!-- Site Migration Warning Banner - Above everything -->
  <site-migration-banner />
  <!-- The main app space. -->
  <v-app color="rgba(0, 0, 0, 1)">
    <!-- Layout will be rendered as part of the router view below -->
    <router-view />
  </v-app>
</template>

<script setup>
  import { onMounted, defineAsyncComponent } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useAppStore } from '@/stores/app';
  import { fireuser } from '@/plugins/firebase';
  import { markDataMigrated } from '@/plugins/store-initializer';
  import { useTarkovStore } from '@/stores/tarkov';
  import { useTarkovData } from '@/composables/tarkovdata';

  const SiteMigrationBanner = defineAsyncComponent(
    () => import('@/features/layout/SiteMigrationBanner')
  );

  const appStore = useAppStore();
  const { locale } = useI18n({ useScope: 'global' });
  
  // Initialize Tarkov data globally to ensure it's available for any route
  useTarkovData();
  
  onMounted(async () => {
    // Check our locale settings
    if (appStore.localeOverride) {
      locale.value = appStore.localeOverride;
    }
    // Check for migration flag in sessionStorage
    const wasMigrated = sessionStorage.getItem('tarkovDataMigrated') === 'true';
    if (wasMigrated && fireuser.loggedIn) {
      // Re-set the migration flag
      markDataMigrated();
      // Make sure data is properly loaded from Firebase
      try {
        const store = useTarkovStore();
        if (store && typeof store.firebindAll === 'function') {
          store.firebindAll();
        }
      } catch (error) {
        console.error('Error rebinding store in App component:', error);
      }
    }
  });
</script>
<style lang="scss">
  // CSS variable for migration banner height (set by SiteMigrationBanner component)
  :root {
    --migration-banner-height: 0px;
  }

  // Offset Vuetify fixed components when migration banner is visible
  .has-migration-banner {
    .v-navigation-drawer {
      top: var(--migration-banner-height) !important;
      height: calc(100% - var(--migration-banner-height)) !important;
    }

    .v-app-bar {
      top: var(--migration-banner-height) !important;
    }

    .v-main {
      padding-top: calc(64px + var(--migration-banner-height)) !important;
    }
  }

  // Set the font family for the application to Share Tech Mono
  .v-application {
    [class*='text-'] {
      font-family: 'Share Tech Mono', sans-serif !important;
      font-display: swap;
    }
    font-family: 'Share Tech Mono', sans-serif !important;
    font-display: swap;
  }
</style>
