<template>
  <v-text-field
    v-model="displayName"
    prepend-icon="mdi-account-circle"
    density="compact"
    :label="$t('app_bar.overflow_menu.display_name')"
    variant="outlined"
    hide-details
    class="mb-4"
    :maxlength="25"
    counter
    :placeholder="$t('app_bar.overflow_menu.display_name_placeholder')"
  >
    <template #append-inner>
      <v-btn
        v-if="displayName"
        icon="mdi-backspace"
        size="x-small"
        variant="text"
        @click="clearDisplayName"
      />
    </template>
  </v-text-field>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import { useTarkovStore } from '@/stores/tarkov';
  const tarkovStore = useTarkovStore();
  const displayName = computed({
    get: () => tarkovStore.getDisplayName() || '',
    set: (newName) => {
      if (newName && newName.trim()) {
        tarkovStore.setDisplayName(newName.trim());
      } else {
        tarkovStore.setDisplayName(null);
      }
    },
  });
  const clearDisplayName = () => {
    tarkovStore.setDisplayName(null);
  };
</script>
