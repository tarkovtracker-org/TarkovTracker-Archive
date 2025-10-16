<template>
  <div v-if="!isXs">
    <div class="d-flex justify-center">
      {{ resolvedLabel }}
    </div>
    <div v-for="alternative in alternativeEntries" :key="alternative.key" class="my-2">
      <TaskLink :task="alternative.task" class="d-flex justify-center" />
    </div>
  </div>
</template>
<script setup>
  import { computed, defineAsyncComponent } from 'vue';
  import { useI18n } from 'vue-i18n';
  const TaskLink = defineAsyncComponent(() => import('./TaskLink.vue'));
  const props = defineProps({
    alternatives: { type: Array, required: true },
    tasks: { type: Array, required: true },
    xs: { type: Boolean, default: false },
    label: { type: String, default: '' },
  });
  const { t } = useI18n({ useScope: 'global' });
  const normalizeId = (value) => {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  };
  // Cache task lookups to avoid repeated linear scans while rendering alternatives.
  const alternativeEntries = computed(() => {
    const taskMap = new Map(
      (props.tasks ?? [])
        .filter((task) => task && task.id !== undefined && task.id !== null)
        .map((task) => [normalizeId(task.id), task])
    );
    return (props.alternatives ?? []).map((taskId, index) => {
      const normalizedId = normalizeId(taskId);
      return {
        key: normalizedId || `alternative-${index}`,
        task: taskMap.get(normalizedId) ?? null,
      };
    });
  });
  const resolvedLabel = computed(() => props.label || t('page.tasks.questcard.alternatives'));
  const isXs = computed(() => props.xs === true);
</script>
