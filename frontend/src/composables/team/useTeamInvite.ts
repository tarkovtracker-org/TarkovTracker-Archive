import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { auth } from '@/plugins/firebase';
import { useLiveData } from '@/composables/livedata';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { logger } from '@/utils/logger';

/**
 * Composable for handling team invite acceptance and related logic
 * Manages invite state, joining teams, and error handling
 */
export function useTeamInvite() {
  const router = useRouter();
  const route = useRoute();
  const { t } = useI18n({ useScope: 'global' });
  const { useSystemStore } = useLiveData();
  const { systemStore } = useSystemStore();

  const functions = getFunctions();
  const joinTeamCallable = httpsCallable(functions, 'joinTeam');
  const leaveTeamCallable = httpsCallable(functions, 'leaveTeam');

  const declined = ref(false);
  const accepting = ref(false);
  const joinTeamSnackbar = ref(false);
  const joinResult = ref('');

  /**
   * Check if invite is present in URL
   */
  const hasInviteInUrl = computed(() => {
    return !!(route.query.team && route.query.code);
  });

  /**
   * Check if user is already in the invited team
   */
  const inInviteTeam = computed(() => {
    return systemStore?.userTeam != null && systemStore.userTeam == route?.query?.team;
  });

  /**
   * Accept team invite
   */
  const acceptInvite = async () => {
    // If the user is already in the team, do nothing
    if (inInviteTeam.value) {
      return;
    }

    accepting.value = true;
    try {
      // Verify user authentication
      if (!auth.currentUser) {
        logger.error('[useTeamInvite] User not authenticated. Cannot accept invite.');
        joinResult.value = t('page.team.card.teaminvite.auth_error');
        joinTeamSnackbar.value = true;
        accepting.value = false;
        return;
      }

      // If user is already in a team, leave it first
      if (systemStore.userTeam != null) {
        try {
          const leaveResponse = await leaveTeamCallable({});
          const leaveResultData = leaveResponse.data;
          if (!(leaveResultData as any).left) {
            joinResult.value = t('page.team.card.teaminvite.leave_error');
            joinTeamSnackbar.value = true;
            accepting.value = false;
            return;
          }
        } catch (error) {
          logger.error('[useTeamInvite] Error leaving team:', error);
          joinResult.value = t('page.team.card.teaminvite.leave_error');
          joinTeamSnackbar.value = true;
          accepting.value = false;
          return;
        }
      }

      // Join the new team
      try {
        const joinPayload = {
          id: route?.query?.team,
          password: route?.query?.code,
        };
        const joinResponse = await joinTeamCallable(joinPayload);
        const joinResponseData = joinResponse.data as any;
        if (!joinResponseData.joined) {
          logger.error('[useTeamInvite] joinTeam OK response but not joined:', joinResponseData);
          joinResult.value = t('page.team.card.teaminvite.join_error');
          joinTeamSnackbar.value = true;
          accepting.value = false;
          return;
        }
        joinResult.value = t('page.team.card.teaminvite.join_success');
        joinTeamSnackbar.value = true;
        accepting.value = false;
        await router.push({ name: 'team' });
      } catch (_error) {
        logger.error(
          '[useTeamInvite] Error joining team:',
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

  /**
   * Decline the invite
   */
  const declineInvite = () => {
    declined.value = true;
  };

  return {
    hasInviteInUrl,
    inInviteTeam,
    declined,
    accepting,
    joinTeamSnackbar,
    joinResult,
    acceptInvite,
    declineInvite,
  };
}
