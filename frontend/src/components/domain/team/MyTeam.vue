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
          @action="handleCopyUrl"
        />
      </v-container>
    </template>
    <template #footer>
      <v-container>
        <v-row align="end" justify="start">
          <v-btn
            v-if="!localUserTeam"
            :disabled="teamManagement.loading.value.createTeam"
            :loading="teamManagement.loading.value.createTeam"
            variant="outlined"
            class="mx-1"
            prepend-icon="mdi-account-group"
            @click="teamManagement.handleCreateTeam"
          >
            {{ $t('page.team.card.myteam.create_new_team') }}
          </v-btn>
          <v-btn
            v-else
            :disabled="teamManagement.loading.value.leaveTeam"
            :loading="teamManagement.loading.value.leaveTeam"
            variant="outlined"
            class="mx-1"
            prepend-icon="mdi-account-off"
            @click="teamManagement.handleLeaveTeam"
          >
            {{
              teamManagement.isTeamOwner.value
                ? $t('page.team.card.myteam.disband_team')
                : $t('page.team.card.myteam.leave_team')
            }}
          </v-btn>
        </v-row>
      </v-container>
    </template>
  </fitted-card>
  <notification-snackbar v-model="teamManagement.notification.value" />
</template>
<script setup>
  import { computed } from 'vue';
  import { useLiveData } from '@/composables/livedata';
  import { useTeamManagement } from '@/composables/team/useTeamManagement';
  import { useTeamUrl } from '@/composables/team/useTeamUrl';
  import FittedCard from '@/components/ui/FittedCard';
  import TeamInputRow from './TeamInputRow.vue';
  import NotificationSnackbar from '@/components/ui/NotificationSnackbar.vue';

  const { useSystemStore } = useLiveData();
  const { systemStore } = useSystemStore();

  // Composables for business logic
  const teamManagement = useTeamManagement();
  const teamUrl = useTeamUrl();

  // Local computed for UI state
  const localUserTeam = computed(() => systemStore.$state.team ?? null);
  const visibleUrl = computed(() => teamUrl.visibleUrl.value);

  /**
   * Handle URL copy with notification feedback
   */
  const handleCopyUrl = async () => {
    const success = await teamUrl.copyUrl();
    if (success) {
      teamManagement.showNotification('URL copied to clipboard');
    } else {
      teamManagement.showNotification('Failed to copy URL', 'error');
    }
  };
</script>
<style lang="scss" scoped></style>
