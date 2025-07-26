<template>
  <v-row>
    <v-col cols="12">
      <v-alert icon="mdi-clipboard-search">
        {{ t('page.tasks.notasksfound') }}
      </v-alert>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n';

  const { t } = useI18n({ useScope: 'global' });
</script>
