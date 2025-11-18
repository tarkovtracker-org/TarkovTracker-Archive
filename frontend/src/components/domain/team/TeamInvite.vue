<template>
  <v-alert
    v-if="invite.hasInviteInUrl.value && !invite.inInviteTeam.value && !invite.declined.value"
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
          :disabled="invite.accepting.value"
          :loading="invite.accepting.value"
          @click="invite.acceptInvite"
        >
          {{ $t('page.team.card.teaminvite.accept') }}
        </v-btn>
        <v-btn variant="outlined" :disabled="invite.accepting.value" @click="invite.declineInvite">
          {{ $t('page.team.card.teaminvite.decline') }}
        </v-btn>
      </div>
    </div>
  </v-alert>
  <v-snackbar v-model="invite.joinTeamSnackbar.value" :timeout="4000" color="accent">
    {{ invite.joinResult.value }}
    <template #actions>
      <v-btn color="white" variant="text" @click="invite.joinTeamSnackbar.value = false">
        Close
      </v-btn>
    </template>
  </v-snackbar>
</template>
<script setup lang="ts">
  import { useTeamInvite } from '@/composables/team/useTeamInvite';

  const invite = useTeamInvite();
</script>
<style lang="scss" scoped></style>
