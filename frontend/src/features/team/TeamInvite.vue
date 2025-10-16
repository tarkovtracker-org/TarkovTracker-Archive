<template>
  <v-alert
    v-if="hasInviteInUrl && !inInviteTeam && !declined"
    color="green"
    theme="dark"
    icon="mdi-handshake"
    density="compact"
    prominent
  >
    <div class="d-flex flex-row align-center justify-space-between">
      <div>
        {{ $t('page.team.card.teaminvite.description') }}
      </div>
      <div>
        <v-btn
          class="mx-1 my-1"
          variant="outlined"
          :disabled="accepting"
          :loading="accepting"
          @click="acceptInvite"
        >
          {{ $t('page.team.card.teaminvite.accept') }}
        </v-btn>
        <v-btn variant="outlined" :disabled="accepting" @click="declined = true">
          {{ $t('page.team.card.teaminvite.decline') }}
        </v-btn>
      </div>
    </div>
  </v-alert>
  <v-snackbar v-model="joinTeamSnackbar" :timeout="4000" color="accent">
    {{ joinResult }}
    <template #actions>
      <v-btn color="white" variant="text" @click="joinTeamSnackbar = false"> Close </v-btn>
    </template>
  </v-snackbar>
</template>
<script setup>
  import { computed, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useI18n } from 'vue-i18n';
  import { auth } from '@/plugins/firebase';
  import { useLiveData } from '@/composables/livedata';
  import { getFunctions, httpsCallable } from 'firebase/functions';
  import { logger } from '@/utils/logger';
  const router = useRouter();
  const { useSystemStore } = useLiveData();
  const systemStore = useSystemStore();
  const { t } = useI18n({ useScope: 'global' });
  const route = useRoute();
  const functions = getFunctions();
  const joinTeamCallable = httpsCallable(functions, 'joinTeam');
  const leaveTeamCallable = httpsCallable(functions, 'leaveTeam');
  const hasInviteInUrl = computed(() => {
    return !!(route.query.team && route.query.code);
  });
  const inInviteTeam = computed(() => {
    return systemStore?.userTeam != null && systemStore.userTeam == route?.query?.team;
  });
  const declined = ref(false);
  const accepting = ref(false);
  const joinTeamSnackbar = ref(false);
  const joinResult = ref('');
  const acceptInvite = async () => {
    // If the user is already in the team, do nothing
    if (inInviteTeam.value) {
      return;
    }
    // Mark the process as started
    accepting.value = true;
    try {
      // Use auth.currentUser to get the ID token
      if (!auth.currentUser) {
        logger.error('[TeamInvite.vue] User not authenticated. Cannot accept invite.');
        joinResult.value = t('page.team.card.teaminvite.auth_error');
        joinTeamSnackbar.value = true;
        accepting.value = false;
        return;
      }
      // If the user is already in a team, leave it first
      if (systemStore.userTeam != null) {
        try {
          const leaveResponse = await leaveTeamCallable({});
          const leaveResult = leaveResponse.data;
          if (!leaveResult.left) {
            joinResult.value = t('page.team.card.teaminvite.leave_error');
            joinTeamSnackbar.value = true;
            accepting.value = false;
            return;
          }
        } catch (error) {
          logger.error('[Invite Debug] Error leaving team:', error);
          joinResult.value = t('page.team.card.teaminvite.leave_error');
          joinTeamSnackbar.value = true;
          accepting.value = false;
          return;
        }
      }
      // Join the team
      try {
        const joinPayload = {
          id: route?.query?.team,
          password: route?.query?.code,
        };
        const joinResponse = await joinTeamCallable(joinPayload);
        const joinResultResp = joinResponse.data;
        if (!joinResultResp.joined) {
          logger.error('[Invite Debug] joinTeam OK response but not joined:', joinResultResp);
          joinResult.value = t('page.team.card.teaminvite.join_error');
          joinTeamSnackbar.value = true;
          accepting.value = false;
          return;
        }
        joinResult.value = t('page.team.card.teaminvite.join_success');
        joinTeamSnackbar.value = true;
        accepting.value = false;
        router.push({ name: 'team' });
      } catch (_error) {
        logger.error(
          '[Invite Debug] Error joining team:',
          _error,
          JSON.stringify(_error, Object.getOwnPropertyNames(_error))
        );
        joinResult.value = t('page.team.card.teaminvite.join_error');
        joinTeamSnackbar.value = true;
        accepting.value = false;
      }
    } catch {
      joinResult.value = t('page.team.card.teaminvite.join_error');
      joinTeamSnackbar.value = true;
      accepting.value = false;
    }
  };
</script>
<style lang="scss" scoped></style>
