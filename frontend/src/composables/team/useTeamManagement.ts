import { ref, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { fireuser, auth, functions, httpsCallable } from '@/plugins/firebase';
import { useLiveData } from '@/composables/livedata';
import { useTarkovStore } from '@/stores/tarkov';
import { logger } from '@/utils/logger';

/**
 * Composable for managing team operations (create, leave, disband)
 * Handles the business logic separate from UI presentation
 */
export function useTeamManagement() {
  const { t } = useI18n({ useScope: 'global' });
  const { useTeamStore, useSystemStore } = useLiveData();
  const { teamStore } = useTeamStore();
  const { systemStore } = useSystemStore();
  const tarkovStore = useTarkovStore();

  const loading = ref({ createTeam: false, leaveTeam: false });
  const notification = ref({ show: false, message: '', color: 'accent' });

  /**
   * Validate user authentication before operations
   */
  const validateAuth = () => {
    if (!fireuser.loggedIn || !fireuser.uid || !auth.currentUser) {
      throw new Error(t('page.team.card.myteam.user_not_authenticated'));
    }
  };

  /**
   * Call a Firebase Cloud Function for team operations
   */
  const callTeamFunction = async (functionName: string, payload = {}) => {
    try {
      const teamFunction = httpsCallable(functions, functionName);
      const response = await teamFunction(payload);
      return response.data;
    } catch (error) {
      logger.error('Error calling team function:', functionName, error);
      throw error;
    }
  };

  /**
   * Wait for store to update based on a condition with timeout
   */
  const waitForStoreUpdate = (storeFn: () => any, condition: (v: any) => boolean, timeout = 15000) => {
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

  /**
   * Show notification feedback to user
   */
  const showNotification = (message: string, color = 'accent') => {
    notification.value = { show: true, message, color };
  };

  /**
   * Generate a random team display name
   */
  const generateRandomName = (length = 6) =>
    Array.from({ length }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(
        Math.floor(Math.random() * 62)
      )
    ).join('');

  /**
   * Create a new team
   */
  const handleCreateTeam = async () => {
    loading.value.createTeam = true;
    try {
      validateAuth();
      const result = await callTeamFunction('createTeam') as any;
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
      if (systemStore.$state.team) {
        if (isTeamOwner.value) {
          tarkovStore.setDisplayName(generateRandomName());
        }
        showNotification(t('page.team.card.myteam.create_team_success'));
      } else {
        throw new Error(t('page.team.card.myteam.create_team_error_ui_update'));
      }
    } catch (error) {
      logger.error('[useTeamManagement] Error creating team:', error);
      const message =
        (error as any).details?.error || (error as Error).message || t('page.team.card.myteam.create_team_error');
      showNotification(message, 'error');
    }
    loading.value.createTeam = false;
  };

  /**
   * Leave or disband team (depending on ownership)
   */
  const handleLeaveTeam = async () => {
    loading.value.leaveTeam = true;
    try {
      validateAuth();
      const result = await callTeamFunction('leaveTeam') as any;
      if (!result?.left && systemStore.$state.team) {
        throw new Error(t('page.team.card.myteam.leave_team_error'));
      }
      const currentDisplayName = tarkovStore.getDisplayName?.();
      if (currentDisplayName && currentDisplayName.startsWith('User ')) {
        // Reset to a generic default display name
        tarkovStore.setDisplayName(null);
      }
      showNotification(t('page.team.card.myteam.leave_team_success'));
    } catch (error) {
      logger.error('[useTeamManagement] Error leaving team:', error);
      const message = (error as Error).message || t('page.team.card.myteam.leave_team_error_unexpected');
      showNotification(message, 'error');
    }
    loading.value.leaveTeam = false;
  };

  /**
   * Computed: Check if current user is team owner
   */
  const isTeamOwner = computed(
    () => teamStore.$state.owner === fireuser.uid && systemStore.$state?.team != null
  );

  /**
   * Watch owner display name to keep it in sync with tarkov store
   */
  watch(
    () => tarkovStore.getDisplayName,
    (newDisplayName) => {
      if (isTeamOwner.value && newDisplayName !== teamStore.getOwnerDisplayName) {
        teamStore.setOwnerDisplayName(newDisplayName);
      }
    }
  );

  return {
    loading,
    notification,
    showNotification,
    handleCreateTeam,
    handleLeaveTeam,
    isTeamOwner,
  };
}
