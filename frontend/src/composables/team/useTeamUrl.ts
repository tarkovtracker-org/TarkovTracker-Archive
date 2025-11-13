import { computed } from 'vue';
import { useLiveData } from '@/composables/livedata';
import { useUserStore } from '@/stores/user';
import { useI18n } from 'vue-i18n';

/**
 * Composable for generating and managing team invite URLs
 * Handles URL generation, copying to clipboard, and streamer mode masking
 */
export function useTeamUrl() {
  const { t } = useI18n({ useScope: 'global' });
  const { useSystemStore, useTeamStore } = useLiveData();
  const { systemStore } = useSystemStore();
  const { teamStore } = useTeamStore();
  const userStore = useUserStore();

  /**
   * Generate the full team invite URL
   */
  const teamUrl = computed(() => {
    const { team: teamId } = systemStore.$state;
    const { password } = teamStore.$state;
    if (!teamId || !password) return '';
    const baseUrl = window.location.href.split('?')[0];
    const params = new URLSearchParams({ team: teamId, code: password });
    return `${baseUrl}?${params}`;
  });

  /**
   * Display URL (masked if streamer mode enabled)
   */
  const visibleUrl = computed(() =>
    userStore.getStreamerMode ? t('page.team.card.myteam.url_hidden') : teamUrl.value
  );

  /**
   * Copy team URL to clipboard
   */
  const copyUrl = async (): Promise<boolean> => {
    if (teamUrl.value) {
      try {
        await navigator.clipboard.writeText(teamUrl.value);
        return true;
      } catch (error) {
        console.error('Failed to copy URL to clipboard:', error);
        return false;
      }
    }
    return false;
  };

  return {
    teamUrl,
    visibleUrl,
    copyUrl,
  };
}
