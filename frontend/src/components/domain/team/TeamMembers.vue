<template>
  <icon-card icon="mdi-account-group" icon-background="secondary" icon-color="white">
    <template #stat>
      {{ $t('page.team.card.manageteam.title') }}
    </template>
    <template #content>
      <template v-if="teamMembers.length > 0">
        <tracker-tip tip="teammembers" class="text-left"></tracker-tip>
        <v-container>
          <v-row>
            <v-col
              v-for="teammate in teamMembers"
              :key="teammate"
              cols="12"
              sm="12"
              md="6"
              lg="4"
              xl="4"
            >
              <teammember-card
                :teammember="teammate"
                :is-team-owner-view="isCurrentUserTeamOwner"
              ></teammember-card>
            </v-col>
          </v-row>
        </v-container>
      </template>
      <template v-else-if="teamMembers.length === 0">
        <v-container>
          <v-row>
            <v-col cols="12" class="text-center">
              {{ $t('page.team.card.manageteam.no_members') }}
            </v-col>
          </v-row>
        </v-container>
      </template>
      <template v-else> </template>
    </template>
  </icon-card>
</template>
<script setup>
  import {
    computed,
    defineAsyncComponent,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    defineProps,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    watch,
    ref,
  } from 'vue';
  import { useLiveData } from '@/composables/livedata';
  import { fireuser } from '@/plugins/firebase';
  const IconCard = defineAsyncComponent(() => import('@/components/ui/IconCard'));
  const TeammemberCard = defineAsyncComponent(() => import('@/components/domain/team/TeammemberCard'));
  const TrackerTip = defineAsyncComponent(() => import('@/components/ui/TrackerTip'));
  const { useTeamStore: useTeamStoreFunction } = useLiveData();
  const { teamStore } = useTeamStoreFunction();
  const teamMembers = ref([]);
  teamStore.$subscribe((mutation, state) => {
    if (state.members) {
      teamMembers.value = state.members;
    } else {
      teamMembers.value = [];
    }
  });
  const isCurrentUserTeamOwner = computed(() => {
    const currentTeamOwner = teamStore.owner;
    const currentFireUID = fireuser.uid;
    return currentTeamOwner === currentFireUID;
  });
</script>
<style lang="scss" scoped></style>
