<template>
  <span v-for="(user, userIndex) in userIds" :key="userIndex">
    <v-icon size="x-small" class="ml-1">mdi-account-child-circle</v-icon>
    {{ teammateNames[user] }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  userIds: string[];
  teammateNames: Record<string, string>;
}>();
</script>
