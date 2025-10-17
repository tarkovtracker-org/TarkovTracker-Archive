<template>
  <span v-for="user in userIds" :key="user" class="mr-1">
    <v-icon
      size="x-small"
      class="ml-1"
      aria-label="Teammate needs this objective"
      title="Teammate needs this objective"
    >mdi-account-child-circle</v-icon>
    {{ teammateNames[user] ?? user }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  userIds: string[];
  teammateNames: Record<string, string>;
}>();
</script>
