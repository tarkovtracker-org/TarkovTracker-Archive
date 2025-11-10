<template>
  <v-card min-width="300" class="pa-2">
    <v-container>
      <v-select
        v-model="selectedGameMode"
        prepend-icon="mdi-sword-cross"
        density="compact"
        :items="gameModeOptions"
        item-title="label"
        item-value="value"
        :label="$t('app_bar.overflow_menu.game_mode')"
        variant="outlined"
        hide-details
        class="mb-4"
      >
        <template #item="{ props, item }">
          <v-list-item v-bind="props" :prepend-icon="item.raw.icon"> </v-list-item>
        </template>
      </v-select>
      <display-name-input v-if="fireuser.loggedIn" />
      <v-select
        v-model="currentPMCFaction"
        prepend-icon="mdi-castle"
        density="compact"
        :items="PMCFactions"
        :label="$t('app_bar.overflow_menu.pmc_faction')"
        variant="outlined"
        hide-details
        class="mb-4"
      >
        <template #item="{ item, props }">
          <v-list-item v-bind="props">
            <template #prepend>
              <v-img :src="factionImage(item.value)" width="1.5em" class="faction-invert mr-1" />
            </template>
          </v-list-item>
        </template>
        <template #prepend-inner>
          <v-img :src="factionImage(currentPMCFaction)" width="1em" class="faction-invert ma-1" />
        </template>
      </v-select>
      <v-select
        v-model="currentLocale"
        prepend-icon="mdi-translate"
        density="compact"
        :items="localeItems"
        :label="$t('app_bar.overflow_menu.language')"
        variant="outlined"
        hide-details
        class="mb-4"
      ></v-select>
      <v-btn
        v-if="!userStore.hideAllTips"
        color="red"
        prepend-icon="mdi-comment-question-outline"
        class="mt-4"
        width="100%"
        @click="enableHideAllTips"
      >
        {{ $t('app_bar.overflow_menu.hide_all_tips') }}
      </v-btn>
      <v-btn
        v-if="userStore.hiddenTipCount > 0 || userStore.hideAllTips"
        color="green"
        prepend-icon="mdi-comment-question-outline"
        class="mt-4"
        width="100%"
        @click="unhideTips"
      >
        {{ $t('app_bar.overflow_menu.reset_tips') }}
      </v-btn>
      <v-divider class="my-4"></v-divider>
      <v-btn
        color="primary"
        variant="tonal"
        prepend-icon="mdi-cog"
        width="100%"
        @click="goToSettings"
      >
        {{ $t('app_bar.overflow_menu.open_settings') }}
      </v-btn>
    </v-container>
  </v-card>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useAppStore } from '@/stores/app';
  import { useUserStore } from '@/stores/user';
  import { useTarkovStore } from '@/stores/tarkov';
  import { fireuser } from '@/plugins/firebase';
  import { useRouter } from 'vue-router';
  import DisplayNameInput from './DisplayNameInput.vue';
  const emit = defineEmits(['close']);
  const userStore = useUserStore();
  const tarkovStore = useTarkovStore();
  const router = useRouter();

  const unhideTips = () => {
    userStore.unhideTips();
  };
  const enableHideAllTips = () => {
    userStore.enableHideAllTips();
  };
  const appStore = useAppStore();

  // Game mode options
  const gameModeOptions = [
    {
      label: 'PvP',
      value: 'pvp',
      icon: 'mdi-sword-cross',
    },
    {
      label: 'PvE',
      value: 'pve',
      icon: 'mdi-account-group',
    },
  ];

  const selectedGameMode = computed({
    get() {
      return tarkovStore.getCurrentGameMode();
    },
    set(newMode) {
      tarkovStore.switchGameMode(newMode);
    },
  });

  // PMC Faction options
  const PMCFactions = [
    { title: 'USEC', value: 'USEC' },
    { title: 'BEAR', value: 'BEAR' },
  ];

  const factionImage = (faction: 'USEC' | 'BEAR') => {
    return `img/factions/${faction}.webp`;
  };

  const currentPMCFaction = computed({
    get() {
      return tarkovStore.getPMCFaction();
    },
    set(newValue) {
      tarkovStore.setPMCFaction(newValue);
    },
  });

  const { availableLocales, locale } = useI18n({ useScope: 'global' });
  const localeItems = computed(() => {
    return availableLocales.map((localeCode) => {
      const languageNames = new Intl.DisplayNames([localeCode], {
        type: 'language',
      });
      return { title: languageNames.of(localeCode), value: localeCode };
    });
  });
  const currentLocale = computed({
    get() {
      return (
        localeItems.value.filter((localeItem) => localeItem.value == locale.value)[0] ||
        localeItems.value[0]
      );
    },
    // setter
    set(newValue) {
      const localeValue = typeof newValue === 'string' ? newValue : newValue.value;
      locale.value = localeValue;
      appStore.localeOverride = localeValue;
    },
  });
  const goToSettings = () => {
    emit('close');
    router.push({ name: 'settings' });
  };
</script>
<style lang="scss" scoped>
  .faction-invert {
    filter: invert(1);
  }
</style>
