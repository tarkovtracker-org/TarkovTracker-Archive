<template>
  <div v-if="!xs">
    <div class="d-flex justify-center">
      {{ label || defaultLabel }}
    </div>
    <div v-for="(alternative, altIndex) in alternatives" :key="altIndex" class="my-2">
      <task-link :task="tasks.find((t) => t.id == alternative)" class="d-flex justify-center" />
    </div>
  </div>
</template>

<script setup>
  import { defineAsyncComponent } from 'vue';
  import { useI18n } from 'vue-i18n';

  const TaskLink = defineAsyncComponent(() => import('@/features/tasks/TaskLink.vue'));

  defineProps({
    alternatives: { type: Array, required: true },
    tasks: { type: Object, required: true },
    xs: { type: Boolean, default: false },
    label: { type: String, default: '' },
  });

  const { t } = useI18n({ useScope: 'global' });

  // Use default label if not provided
  const defaultLabel = t('page.tasks.questcard.alternatives');
</script>
