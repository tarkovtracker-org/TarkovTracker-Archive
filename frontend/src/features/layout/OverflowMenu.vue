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
        v-model="currentGameEdition"
        prepend-icon="mdi-gift-open"
        density="compact"
        :items="gameEditions"
        :label="$t('app_bar.overflow_menu.game_edition')"
        variant="outlined"
        hide-details
        class="mb-4"
      ></v-select>
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
      <div v-if="fireuser.loggedIn" class="d-flex align-center mb-4">
        <v-icon class="mr-3">mdi-eye</v-icon>
        <v-switch
          v-model="streamerMode"
          :disabled="Boolean(userStore.saving && userStore.saving.streamerMode)"
          hide-details
          density="compact"
          color="green"
          base-color="error"
          :label="$t('app_bar.overflow_menu.streamer_mode')"
          class="flex-grow-1"
        />
        <v-progress-circular
          v-if="userStore.saving && userStore.saving.streamerMode"
          indeterminate
          color="primary"
          size="20"
          class="ml-2"
        />
      </div>
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
      <v-dialog v-if="fireuser.loggedIn" v-model="resetDialog">
        <template #activator="{ props }">
          <v-btn color="warning" prepend-icon="mdi-alert" class="mt-4" width="100%" v-bind="props">
            {{
              $t('app_bar.overflow_menu.reset_gamemode_data', {
                mode: selectedGameMode.toUpperCase(),
              })
            }}
          </v-btn>
        </template>
        <v-row class="justify-center">
          <v-col cols="auto">
            <v-card
              :title="$t('app_bar.overflow_menu.reset_gamemode_confirm_title')"
              style="width: fit-content"
            >
              <v-card-text>
                <v-container class="ma-0 pa-0">
                  <v-row no-gutters>
                    <v-col cols="12">
                      {{
                        $t('app_bar.overflow_menu.reset_gamemode_confirmation', {
                          mode: selectedGameMode.toUpperCase(),
                        })
                      }}
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-btn
                        color="red"
                        block
                        prepend-icon="mdi-alert"
                        @click="
                          tarkovStore.resetCurrentGameModeData();
                          resetDialog = false;
                        "
                      >
                        {{
                          $t('app_bar.overflow_menu.reset_gamemode_confirm_button', {
                            mode: selectedGameMode.toUpperCase(),
                          })
                        }}
                      </v-btn>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-btn color="primary" block @click="resetDialog = false">{{
                        $t('app_bar.overflow_menu.reset_gamemode_cancel_button')
                      }}</v-btn>
                    </v-col>
                  </v-row>
                </v-container>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-dialog>
      <div v-else class="mt-4">
        <v-alert type="warning" variant="tonal" density="comfortable" class="text-body-2">
          <span class="font-weight-medium">Sign in to manage game mode resets.</span>
        </v-alert>
      </div>
      <v-dialog v-if="fireuser.loggedIn" v-model="fullResetDialog">
        <template #activator="{ props }">
          <v-btn
            color="error"
            prepend-icon="mdi-account-remove"
            class="mt-4"
            width="100%"
            v-bind="props"
          >
            {{ $t('app_bar.overflow_menu.full_account_reset') }}
          </v-btn>
        </template>
        <v-row class="justify-center">
          <v-col cols="auto">
            <v-card
              :title="$t('app_bar.overflow_menu.full_account_reset_confirm_title')"
              style="width: fit-content"
            >
              <v-card-text>
                <v-container class="ma-0 pa-0">
                  <v-row no-gutters>
                    <v-col cols="12">
                      <v-alert
                        type="error"
                        variant="tonal"
                        class="mb-4"
                        prepend-icon="mdi-alert-circle"
                      >
                        {{ $t('app_bar.overflow_menu.full_account_reset_warning') }}
                      </v-alert>
                      {{ $t('app_bar.overflow_menu.full_account_reset_confirmation') }}
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-btn
                        color="error"
                        block
                        prepend-icon="mdi-account-remove"
                        @click="
                          tarkovStore.resetOnlineProfile();
                          fullResetDialog = false;
                        "
                      >
                        {{ $t('app_bar.overflow_menu.full_account_reset_confirm_button') }}
                      </v-btn>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-btn color="primary" block @click="fullResetDialog = false">{{
                        $t('app_bar.overflow_menu.full_account_reset_cancel_button')
                      }}</v-btn>
                    </v-col>
                  </v-row>
                </v-container>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-dialog>
    </v-container>
  </v-card>
</template>
<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useAppStore } from '@/stores/app';
  import { useUserStore } from '@/stores/user';
  import { useTarkovStore } from '@/stores/tarkov';
  import { fireuser } from '@/plugins/firebase';
  import type { GameMode } from '@/shared_state';
  import DisplayNameInput from './DisplayNameInput.vue';
  const userStore = useUserStore();
  const tarkovStore = useTarkovStore();
  const resetDialog = ref(false);
  const fullResetDialog = ref(false);

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
    set(newMode: GameMode) {
      tarkovStore.switchGameMode(newMode);
    },
  });

  // PMC Faction options
  const PMCFactions = [
    { title: 'USEC', value: 'USEC' },
    { title: 'BEAR', value: 'BEAR' },
  ];

  const factionImage = (faction: string) => {
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

  // Game Edition options
  const gameEditions = [
    { title: 'Standard Edition', value: 1 },
    { title: 'Left Behind Edition', value: 2 },
    { title: 'Prepare for Escape Edition', value: 3 },
    { title: 'Edge of Darkness (Limited Edition)', value: 4 },
    { title: 'Unheard Edition', value: 5 },
    { title: 'Unheard + Edge Of Darkness (EOD) Edition', value: 6 },
  ];

  const currentGameEdition = computed({
    get() {
      return tarkovStore.getGameEdition();
    },
    set(newValue) {
      tarkovStore.setGameEdition(newValue);
    },
  });

  const streamerMode = computed({
    get() {
      return userStore.getStreamerMode;
    },
    set(newValue) {
      userStore.setStreamerMode(newValue);
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
</script>
<style lang="scss" scoped>
  .faction-invert {
    filter: invert(1);
  }
</style>
