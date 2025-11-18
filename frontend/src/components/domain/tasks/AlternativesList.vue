<template>
  <div v-if="!xs">
    <div class="d-flex justify-center">
      {{ label || defaultLabel }}
    </div>
    <div v-for="(alternative, altIndex) in alternatives" :key="altIndex" class="my-2">
      <task-link
        v-if="tasks[alternative]"
        :task="tasks[alternative]"
        class="d-flex justify-center"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
  import { useI18n } from 'vue-i18n';
  import TaskLink from '@/components/domain/tasks/TaskLink.vue';

  import type { Task } from '@/types/models/tarkov';

  interface Props {
    alternatives: string[];
    tasks: Record<string, Task>;
    xs?: boolean;
    label?: string;
  }

  withDefaults(defineProps<Props>(), {
    xs: false,
    label: '',
  });

  const { t } = useI18n({ useScope: 'global' });
  // Use default label if not provided
  const defaultLabel = t('page.tasks.questcard.alternatives');
</script>
