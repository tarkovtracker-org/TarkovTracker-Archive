<template>
  <div class="task-actions">
    <template v-if="!isComplete && !isLocked">
      <ActionButton
        :xs="xs"
        color="success"
        icon="mdi-check-all"
        :text="t('page.tasks.questcard.completebutton')"
        @click="$emit('complete')"
      />
      <AlternativesList
        v-if="task.alternatives?.length"
        :alternatives="task.alternatives"
        :tasks="tasks"
      />
    </template>

    <template v-else-if="isComplete">
      <ActionButton
        :xs="xs"
        color="accent"
        icon="mdi-undo"
        :text="t('page.tasks.questcard.uncompletebutton')"
        @click="$emit('uncomplete')"
      />
      <AlternativesList
        v-if="task.alternatives?.length"
        :alternatives="task.alternatives"
        :tasks="tasks"
        :label="t('page.tasks.questcard.alternativefailed')"
      />
    </template>

    <template v-else-if="!isOurFaction">
      {{ t('page.tasks.questcard.differentfaction') }}
    </template>

    <template v-else-if="isLocked">
      <ActionButton
        :xs="xs"
        color="accent"
        icon="mdi-fast-forward"
        :text="t('page.tasks.questcard.availablebutton')"
        class="task-actions__button"
        @click="$emit('unlock')"
      />
      <ActionButton
        :xs="xs"
        color="success"
        icon="mdi-check-all"
        :text="t('page.tasks.questcard.completebutton')"
        class="task-actions__button"
        @click="$emit('complete')"
      />
    </template>
    <div v-if="experienceDisplay" class="task-experience">XP: {{ experienceDisplay }}</div>
  </div>
</template>

<script setup>
  import { defineAsyncComponent, computed } from 'vue';
  import { useI18n } from 'vue-i18n';

  const ActionButton = defineAsyncComponent(() => import('./ActionButton'));
  const AlternativesList = defineAsyncComponent(() => import('./AlternativesList'));

  const props = defineProps({
    task: { type: Object, required: true },
    tasks: { type: Object, required: true },
    xs: { type: Boolean, required: true },
    isComplete: { type: Boolean, required: true },
    isLocked: { type: Boolean, required: true },
    isOurFaction: { type: Boolean, required: true },
    showExperience: { type: Boolean, default: true },
    experience: { type: Number, default: 0 },
  });

  defineEmits(['complete', 'uncomplete', 'unlock']);

  const { t } = useI18n({ useScope: 'global' });

  const experienceDisplay = computed(() => {
    if (!props.showExperience) return '';
    const xp = Number(props.experience || 0);
    if (!xp) return '';
    return `+${xp.toLocaleString()}`;
  });
</script>

<style lang="scss" scoped>
  .task-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }

  .task-actions__button {
    margin: 4px 0;
  }

  :deep(.v-btn.mx-1.my-1) {
    margin: 0;
  }

  @media (max-width: 959px) {
    .task-actions {
      align-items: center;
    }
  }

  @media (min-width: 960px) and (max-width: 1600px) {
    .task-actions {
      flex-direction: row;
      justify-content: flex-end;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
    }

    .task-experience {
      order: -1;
    }
  }

  .task-experience {
    display: inline-flex;
    align-items: center;
    font-size: 0.88rem;
    letter-spacing: 0.04em;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    background: rgba(var(--v-theme-success), 0.2);
    border: 1px solid rgba(var(--v-theme-success), 0.5);
    border-radius: 6px;
    padding: 2px 10px;
    text-transform: uppercase;
    font-variant-numeric: tabular-nums;
  }
</style>
