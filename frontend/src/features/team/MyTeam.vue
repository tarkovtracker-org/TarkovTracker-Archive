<template>
  <fitted-card icon="mdi-account-supervisor" icon-color="white" highlight-color="secondary">
    <template #title>
      {{ $t('page.team.card.myteam.title') }}
    </template>
    <template #content>
      <div v-if="!localUserTeam" class="text-center py-4">
        {{ $t('page.team.card.myteam.no_team') }}
      </div>
      <v-container v-else>
        <team-input-row
          v-model="visibleUrl"
          :label="$t('page.team.card.myteam.team_invite_url_label')"
          icon="mdi-content-copy"
          readonly
          @action="copyUrl"
        />
      </v-container>
    </template>
    <template #footer>
      <v-container>
        <v-row align="end" justify="start">
          <v-btn
            v-if="!localUserTeam"
            :disabled="loading.createTeam"
            :loading="loading.createTeam"
            variant="outlined"
            class="mx-1"
            prepend-icon="mdi-account-group"
            @click="handleCreateTeam"
          >
            {{ $t('page.team.card.myteam.create_new_team') }}
          </v-btn>
          <v-btn
            v-else
            :disabled="loading.leaveTeam"
            :loading="loading.leaveTeam"
            variant="outlined"
            class="mx-1"
            prepend-icon="mdi-account-off"
            @click="handleLeaveTeam"
          >
            {{
              isTeamOwner
                ? $t('page.team.card.myteam.disband_team')
                : $t('page.team.card.myteam.leave_team')
            }}
          </v-btn>
        </v-row>
      </v-container>
    </template>
  </fitted-card>
  <notification-snackbar v-model="notification" />
</template>
<script setup>
  import { ref, computed, watch, nextTick } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { fireuser, auth, functions, httpsCallable } from '@/plugins/firebase';
  import { useLiveData } from '@/composables/livedata';
  import { useUserStore } from '@/stores/user';
  import { useTarkovStore } from '@/stores/tarkov';
  import FittedCard from '@/features/ui/FittedCard';
  import TeamInputRow from './TeamInputRow.vue';
  import NotificationSnackbar from '@/features/ui/NotificationSnackbar.vue';
  import { logger } from '@/utils/logger';
  const { t } = useI18n({ useScope: 'global' });
  const { useTeamStore, useSystemStore } = useLiveData();
  const { teamStore } = useTeamStore();
  const { systemStore } = useSystemStore();
  const userStore = useUserStore();
  const tarkovStore = useTarkovStore();

  const generateRandomName = (length = 6) =>
    Array.from({ length }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(
        Math.floor(Math.random() * 62)
      )
    ).join('');
  const localUserTeam = computed(() => systemStore.$state?.team || null);
  const isTeamOwner = computed(
    () => teamStore.$state.owner === fireuser.uid && systemStore.$state?.team != null
  );
  const loading = ref({ createTeam: false, leaveTeam: false });
  const notification = ref({ show: false, message: '', color: 'accent' });

  const validateAuth = () => {
    if (!fireuser.loggedIn || !fireuser.uid || !auth.currentUser) {
      throw new Error(t('page.team.card.myteam.user_not_authenticated'));
    }
  };

  const callTeamFunction = async (functionName, payload = {}) => {
    try {
      const teamFunction = httpsCallable(functions, functionName);
      const response = await teamFunction(payload);
      return response.data;
    } catch (error) {
      logger.error('Error calling team function:', functionName, error);
      throw error;
    }
  };

  const waitForStoreUpdate = (storeFn, condition, timeout = 15000) => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error('Store update timeout')), timeout);
      const unwatch = watch(
        storeFn,
        (newValue) => {
          if (condition(newValue)) {
            clearTimeout(timeoutId);
            unwatch();
            resolve(newValue);
          }
        },
        { immediate: true, deep: true }
      );
    });
  };

  const showNotification = (message, color = 'accent') => {
    notification.value = { show: true, message, color };
  };

  const handleCreateTeam = async () => {
    loading.value.createTeam = true;
    try {
      validateAuth();
      const result = await callTeamFunction('createTeam');

      if (!result?.team) {
        throw new Error(t('page.team.card.myteam.create_team_error_ui_update'));
      }

      await waitForStoreUpdate(
        () => systemStore.$state.team,
        (teamId) => teamId != null
      );
      await waitForStoreUpdate(
        () => teamStore.$state,
        (state) => state?.owner === fireuser.uid && state?.password
      );
      await nextTick();

      if (localUserTeam.value) {
        if (isTeamOwner.value) {
          tarkovStore.setDisplayName(generateRandomName());
        }
        showNotification(t('page.team.card.myteam.create_team_success'));
      } else {
        throw new Error(t('page.team.card.myteam.create_team_error_ui_update'));
      }
    } catch (error) {
      logger.error('[MyTeam] Error creating team:', error);
      const message =
        error.details?.error || error.message || t('page.team.card.myteam.create_team_error');
      showNotification(message, 'error');
    }
    loading.value.createTeam = false;
  };
  const handleLeaveTeam = async () => {
    loading.value.leaveTeam = true;
    try {
      validateAuth();
      const result = await callTeamFunction('leaveTeam');

      if (!result?.left && systemStore.$state.team) {
        throw new Error(t('page.team.card.myteam.leave_team_error'));
      }

      if (tarkovStore.displayName.startsWith('User ')) {
        tarkovStore.setDisplayName(tarkovStore.getDefaultDisplayName());
      }
      showNotification(t('page.team.card.myteam.leave_team_success'));
    } catch (error) {
      logger.error('[MyTeam] Error leaving team:', error);
      const message = error.message || t('page.team.card.myteam.leave_team_error_unexpected');
      showNotification(message, 'error');
    }
    loading.value.leaveTeam = false;
  };
  const copyUrl = () => {
    if (teamUrl.value) {
      navigator.clipboard.writeText(teamUrl.value);
      showNotification('URL copied to clipboard');
    }
  };

  const teamUrl = computed(() => {
    const { team: teamId } = systemStore.$state;
    const { password } = teamStore.$state;
    if (!teamId || !password) return '';

    const baseUrl = window.location.href.split('?')[0];
    const params = new URLSearchParams({ team: teamId, code: password });
    return `${baseUrl}?${params}`;
  });

  const visibleUrl = computed(() =>
    userStore.getStreamerMode ? t('page.team.card.myteam.url_hidden') : teamUrl.value
  );

  watch(
    () => tarkovStore.getDisplayName,
    (newDisplayName) => {
      if (isTeamOwner.value && newDisplayName !== teamStore.getOwnerDisplayName) {
        teamStore.setOwnerDisplayName(newDisplayName);
      }
    }
  );
</script>
<style lang="scss" scoped></style>
