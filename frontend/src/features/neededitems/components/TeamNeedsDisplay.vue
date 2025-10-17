<template>
  <div class="text-center">
    <i18n-t keypath="page.neededitems.neededby" scope="global">
      <template #users>
        <div
          v-for="(userNeed, userIndex) in teamNeeds"
          :key="userIndex"
          class="d-flex align-center justify-center"
        >
          <v-icon size="x-small" class="mr-1">mdi-account-child-circle</v-icon>
          {{ getDisplayName(userNeed.user) }}
          {{ userNeed.count.toLocaleString() }}/{{ neededCount.toLocaleString() }}
        </div>
      </template>
    </i18n-t>
  </div>
</template>
<script setup lang="ts">
  import { useProgressQueries } from '@/composables/useProgressQueries';
  interface UserNeed {
    user: string;
    count: number;
  }
  defineProps<{
    teamNeeds: UserNeed[];
    neededCount: number;
  }>();
  const { getDisplayName } = useProgressQueries();
</script>
