<template>
  <v-app color="rgba(0, 0, 0, 1)">
    <router-view />
  </v-app>
</template>
<script setup lang="ts">
  import { onMounted } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useAppStore } from '@/stores/app';
  import { fireuser } from '@/plugins/firebase';
  import { markDataMigrated } from '@/plugins/store-initializer';
  import { useTarkovStore } from '@/stores/tarkov';
  import { useTarkovData } from '@/composables/tarkovdata';
  import { logger } from '@/utils/logger';
  import type { StoreWithFireswapExt } from '@/plugins/pinia-firestore';
  const { locale } = useI18n({ useScope: 'global' });
  // Initialize composable
  useTarkovData();
  onMounted(async () => {
    // Access store only after component is mounted
    const appStore = useAppStore() as StoreWithFireswapExt<ReturnType<typeof useAppStore>>;
    if (appStore.localeOverride) {
      locale.value = appStore.localeOverride;
    }
    const wasMigrated = sessionStorage.getItem('tarkovDataMigrated') === 'true';
    if (wasMigrated && fireuser.loggedIn) {
      markDataMigrated();
      try {
        const store = useTarkovStore() as StoreWithFireswapExt<ReturnType<typeof useTarkovStore>>;
        if (store && typeof store.firebindAll === 'function') {
          store.firebindAll();
        }
      } catch (error) {
        logger.error('Error rebinding store in App component:', error);
      }
    }
  });
</script>
<style lang="scss">
  .v-application {
    [class*='text-'] {
      font-family: 'Share Tech Mono', 'Courier New', Courier, monospace !important;
    }
    font-family: 'Share Tech Mono', 'Courier New', Courier, monospace !important;
  }
</style>
