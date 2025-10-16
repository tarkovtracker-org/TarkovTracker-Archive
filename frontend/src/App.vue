<template>
  <v-app color="rgba(0, 0, 0, 1)">
    <router-view />
  </v-app>
</template>

<script setup>
  import { onMounted } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useAppStore } from '@/stores/app';
  import { fireuser } from '@/plugins/firebase';
  import { markDataMigrated } from '@/plugins/store-initializer';
  import { useTarkovStore } from '@/stores/tarkov';
  import { useTarkovData } from '@/composables/tarkovdata';
  import { logger } from '@/utils/logger';
  const appStore = useAppStore();
  const { locale } = useI18n({ useScope: 'global' });
  useTarkovData();
  onMounted(async () => {
    if (appStore.localeOverride) {
      locale.value = appStore.localeOverride;
    }
    const wasMigrated = sessionStorage.getItem('tarkovDataMigrated') === 'true';
    if (wasMigrated && fireuser.loggedIn) {
      markDataMigrated();
      try {
        const store = useTarkovStore();
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
      font-family: 'Share Tech Mono', sans-serif !important;
      font-display: swap;
    }
    font-family: 'Share Tech Mono', sans-serif !important;
    font-display: swap;
  }
</style>
