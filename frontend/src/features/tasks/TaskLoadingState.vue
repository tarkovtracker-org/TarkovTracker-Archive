<template>
  <v-row justify="center">
    <v-col cols="12" align="center">
      <v-progress-circular indeterminate color="secondary" class="mx-2" />
      {{ t('page.tasks.loading') }}
      <refresh-button />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
  import { defineAsyncComponent } from 'vue';
  import { useI18n } from 'vue-i18n';

  const RefreshButton = defineAsyncComponent(() => import('@/features/ui/RefreshButton.vue'));
  const { t } = useI18n({ useScope: 'global' });
</script>
