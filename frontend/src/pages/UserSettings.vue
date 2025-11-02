<template>
  <v-container class="settings-page h-100 pb-0 mb-0">
    <v-row class="justify-center">
      <v-col cols="12" md="10" lg="8">
        <fitted-card icon="mdi-account-cog" icon-color="white" :fill-height="false">
          <template #title>
            {{ $t('page.settings.cards.profile.title') }}
          </template>
          <template #content>
            <p class="text-body-2 mb-4">
              {{ $t('page.settings.cards.profile.description') }}
            </p>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-select
                  v-model="currentGameEdition"
                  :items="gameEditionOptions"
                  :label="$t('page.settings.fields.game_edition')"
                  prepend-icon="mdi-gift-open"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6" class="d-flex align-center">
                <div class="w-100">
                  <div class="d-flex align-center">
                    <v-icon class="mr-3">mdi-eye</v-icon>
                    <v-switch
                      v-model="streamerMode"
                      :disabled="Boolean(userStore.saving && userStore.saving.streamerMode)"
                      :label="$t('page.settings.fields.streamer_privacy_mode')"
                      color="green"
                      base-color="error"
                      density="compact"
                      hide-details
                    />
                    <v-progress-circular
                      v-if="userStore.saving && userStore.saving.streamerMode"
                      indeterminate
                      color="primary"
                      size="20"
                      class="ml-2"
                    />
                  </div>
                  <p class="text-body-2 mt-2 mb-0">
                    {{ $t('page.settings.cards.profile.streamer_privacy_hint') }}
                  </p>
                </div>
              </v-col>
            </v-row>
          </template>
        </fitted-card>
      </v-col>
    </v-row>

    <v-row class="justify-center">
      <v-col cols="12" md="10" lg="8">
        <fitted-card
          icon="mdi-restore"
          icon-color="white"
          highlight-color="warning"
          :fill-height="false"
        >
          <template #title>
            {{ $t('page.settings.cards.progress.title') }}
          </template>
          <template #content>
            <p class="text-body-2 mb-4">
              {{ $t('page.settings.cards.progress.description') }}
            </p>
            <v-alert v-if="!fireuser.loggedIn" type="warning" variant="tonal" class="mb-4" dense>
              {{ $t('page.settings.cards.progress.login_required') }}
            </v-alert>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-btn
                  block
                  color="warning"
                  prepend-icon="mdi-sword-cross"
                  :disabled="!fireuser.loggedIn || resetting"
                  @click="openResetDialog('pvp')"
                >
                  {{ $t('page.settings.cards.progress.reset_pvp') }}
                </v-btn>
              </v-col>
              <v-col cols="12" md="6">
                <v-btn
                  block
                  color="info"
                  prepend-icon="mdi-account-group"
                  :disabled="!fireuser.loggedIn || resetting"
                  @click="openResetDialog('pve')"
                >
                  {{ $t('page.settings.cards.progress.reset_pve') }}
                </v-btn>
              </v-col>
            </v-row>
          </template>
        </fitted-card>
      </v-col>
    </v-row>

    <v-row class="justify-center mb-6">
      <v-col cols="12" md="10" lg="8">
        <fitted-card
          icon="mdi-account-remove"
          icon-color="white"
          highlight-color="error"
          :fill-height="false"
        >
          <template #title>
            {{ $t('page.settings.cards.account_reset.title') }}
          </template>
          <template #content>
            <p class="text-body-2 mb-4">
              {{ $t('page.settings.cards.account_reset.description') }}
            </p>
            <v-btn
              block
              color="error"
              prepend-icon="mdi-alert-circle"
              :disabled="!fireuser.loggedIn || fullResetting"
              @click="fullResetDialog = true"
            >
              {{ $t('page.settings.cards.account_reset.button') }}
            </v-btn>
          </template>
        </fitted-card>
      </v-col>
    </v-row>

    <v-row v-if="fireuser.loggedIn" class="justify-center mb-8">
      <v-col cols="12" md="10" lg="8">
        <account-deletion-card class="flex-grow-1" />
      </v-col>
    </v-row>

    <v-dialog v-model="resetDialogOpen" max-width="460">
      <v-card :title="$t('page.settings.dialogs.reset_mode.title', { mode: resetModeLabel })">
        <v-card-text>
          <p class="mb-4">
            {{ $t('page.settings.dialogs.reset_mode.description', { mode: resetModeLabel }) }}
          </p>
          <v-alert type="warning" variant="tonal" class="mb-4" dense>
            {{ $t('page.settings.dialogs.reset_mode.warning') }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="closeResetDialog">
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn color="warning" :loading="resetting" :disabled="resetting" @click="confirmReset">
            {{ $t('page.settings.dialogs.reset_mode.confirm', { mode: resetModeLabel }) }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="fullResetDialog" max-width="520">
      <v-card :title="$t('page.settings.dialogs.full_reset.title')">
        <v-card-text>
          <v-alert type="error" variant="tonal" class="mb-4" dense>
            {{ $t('page.settings.dialogs.full_reset.warning') }}
          </v-alert>
          <p class="mb-4">
            {{ $t('page.settings.dialogs.full_reset.description') }}
          </p>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="fullResetDialog = false">
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn
            color="error"
            :loading="fullResetting"
            :disabled="fullResetting"
            @click="confirmFullReset"
          >
            {{ $t('page.settings.dialogs.full_reset.confirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { fireuser } from '@/plugins/firebase';
  import { useTarkovStore } from '@/stores/tarkov';
  import { useUserStore } from '@/stores/user';
  import FittedCard from '@/features/ui/FittedCard.vue';
  import AccountDeletionCard from '@/features/settings/AccountDeletionCard.vue';
  import type { GameMode } from '@/shared_state';
  import { logger } from '@/utils/logger';

  const { t } = useI18n({ useScope: 'global' });
  const tarkovStore = useTarkovStore();
  const userStore = useUserStore();

  const gameEditionOptions = computed(() => [
    { title: t('page.settings.options.edition_standard'), value: 1 },
    { title: t('page.settings.options.edition_left_behind'), value: 2 },
    { title: t('page.settings.options.edition_prepare_escape'), value: 3 },
    { title: t('page.settings.options.edition_edge_darkness'), value: 4 },
    { title: t('page.settings.options.edition_unheard'), value: 5 },
    { title: t('page.settings.options.edition_unheard_eod'), value: 6 },
  ]);

  const currentGameEdition = computed({
    get() {
      return tarkovStore.getGameEdition();
    },
    set(newValue: number) {
      tarkovStore.setGameEdition(newValue);
    },
  });

  const streamerMode = computed({
    get() {
      return userStore.getStreamerMode;
    },
    set(newValue: boolean) {
      userStore.setStreamerMode(newValue);
    },
  });

  const resetDialogMode = ref<GameMode | null>(null);
  const resetDialogOpen = computed({
    get() {
      return resetDialogMode.value !== null;
    },
    set(value: boolean) {
      if (!value) {
        resetDialogMode.value = null;
      }
    },
  });
  const resetting = ref(false);
  const fullResetDialog = ref(false);
  const fullResetting = ref(false);

  const resetModeLabel = computed(() => {
    if (!resetDialogMode.value) {
      return '';
    }
    return resetDialogMode.value.toUpperCase();
  });

  const openResetDialog = (mode: GameMode) => {
    resetDialogMode.value = mode;
  };

  const closeResetDialog = () => {
    resetDialogMode.value = null;
  };

  const confirmReset = async () => {
    if (!resetDialogMode.value) {
      return;
    }
    resetting.value = true;
    try {
      await tarkovStore.resetGameModeData(resetDialogMode.value);
      closeResetDialog();
    } catch (error) {
      logger.error('Failed to reset gamemode data:', error);
    } finally {
      resetting.value = false;
    }
  };

  const confirmFullReset = async () => {
    fullResetting.value = true;
    try {
      await tarkovStore.resetOnlineProfile();
      fullResetDialog.value = false;
    } catch (error) {
      logger.error('Failed to reset account:', error);
    } finally {
      fullResetting.value = false;
    }
  };
</script>
<style scoped>
  .settings-page {
    min-height: calc(100vh - 210px);
    margin-bottom: 0 !important;
    padding-bottom: 32px !important;
  }

  .w-100 {
    width: 100%;
  }
</style>
