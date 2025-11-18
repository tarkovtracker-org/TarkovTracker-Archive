import { computed, ref } from 'vue';

export function useNeededItemRow(props: any) {
  const cardRef = ref<HTMLElement | null>(null);
  const showDialog = ref(false);

  // Compute item-related data
  const imageItem = computed(() => props.need.alternativeItems?.[0] || props.need.item);

  const isVisible = computed(() => {
    return imageItem.value?.iconLink && imageItem.value.iconLink.trim() !== '';
  });

  const itemImageClasses = computed(() => {
    return {
      'item-image': true,
      'banned-item': props.need.item?.banned,
      'needed-item': !props.need.item?.banned,
    };
  });

  const itemRowClasses = computed(() => {
    return {
      'needed-item-row': true,
      completed: props.need.completed,
      removed: props.need.removed,
      fIR: props.need.foundInRaid,
    };
  });

  // Compute related task data
  const relatedTask = computed(() => {
    return props.need.needType === 'taskObjective' ? props.need.task : null;
  });

  const levelRequired = computed(() => {
    if (props.need.needType === 'taskObjective' && props.need.task) {
      return props.need.task.minPlayerLevel || 0;
    }
    if (props.need.needType === 'hideoutModule' && props.need.station) {
      return props.need.station.level || 0;
    }
    return 0;
  });

  const lockedBefore = computed(() => {
    if (props.need.needType === 'taskObjective' && props.need.task) {
      const completed = props.need.task.completed;
      const hasPredecessors = props.need.task.predecessors?.length > 0;

      if (completed || hasPredecessors) {
        return props.need.task.predecessors?.length || 0;
      }
    }
    return 0;
  });

  const relatedStation = computed(() => {
    return props.need.needType === 'hideoutModule' ? props.need.station : null;
  });

  const mdAndUp = computed(() => {
    // This would need to be computed from actual team data
    // For now, return a default value
    return false;
  });

  const selfCompletedNeed = computed(() => {
    // This would need to check actual completion status
    // For now, return false
    return false;
  });

  const teamNeeds = computed<Array<{ user: string; count: number }>>(() => {
    // This would need to check actual team needs
    // For now, return empty array
    return [];
  });

  const neededCount = computed(() => {
    if (!props.need.count) return '0';
    return Math.abs(props.need.count).toLocaleString();
  });

  function getDisplayName(user: any) {
    return user.displayName ?? user.nickname ?? user.email ?? 'Unknown';
  }

  function showTeamDialog() {
    showDialog.value = true;
  }

  function closeTeamDialog() {
    showDialog.value = false;
  }

  return {
    // Refs
    cardRef,
    showDialog,

    // Computed
    imageItem,
    isVisible,
    itemImageClasses,
    itemRowClasses,
    relatedTask,
    levelRequired,
    lockedBefore,
    relatedStation,
    mdAndUp,
    selfCompletedNeed,
    teamNeeds,
    neededCount,

    // Actions
    showTeamDialog,
    closeTeamDialog,

    // Helpers
    getDisplayName,
  };
}
