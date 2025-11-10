<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12">
        <v-select
          v-model="selectedGameMode"
          :items="gameModeOptions"
          item-title="label"
          item-value="value"
          density="compact"
          variant="outlined"
          hide-details
          :label="$t('page.settings.card.gamemode.select')"
        >
          <template #prepend-inner>
            <v-icon :icon="currentModeIcon" size="small" />
          </template>
          <template #item="{ props, item }">
            <v-list-item v-bind="props" :prepend-icon="item.raw.icon"> </v-list-item>
          </template>
        </v-select>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import { useTarkovStore } from '@/stores/tarkov';
  import type { GameMode } from '@/shared_state';

  const store = useTarkovStore();
  const gameModeOptions = [
    {
      label: 'PvP',
      value: 'pvp',
      icon: 'mdi-sword-cross',
      description: 'Player vs Player (Standard)',
    },
    {
      label: 'PvE',
      value: 'pve',
      icon: 'mdi-account-group',
      description: 'Player vs Environment (Co-op)',
    },
  ];

  const selectedGameMode = computed({
    get() {
      return store.getCurrentGameMode();
    },
    set(newMode: GameMode) {
      store.switchGameMode(newMode);
    },
  });

  const currentModeIcon = computed(() => {
    const currentMode = store.getCurrentGameMode();
    return (
      gameModeOptions.find((option) => option.value === currentMode)?.icon || 'mdi-sword-cross'
    );
  });
</script>

<style scoped>
  /* No additional styles needed for settings page version */
</style>
