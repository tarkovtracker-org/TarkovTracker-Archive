<template>
  <div
    :style="markerStyle"
    :class="markerColor"
    @mouseenter="showTooltip()"
    @mouseleave="hideTooltip()"
    @click="forceTooltipToggle()"
  >
    <v-icon>{{ tooltipVisible == true ? 'mdi-map-marker-radius' : 'mdi-map-marker' }}</v-icon>
  </div>
  <div v-if="tooltipVisible" :style="tooltipStyle">
    <v-sheet class="ma-0 elevation-3 rounded px-1 pt-2" color="primary">
      <task-link :task="relatedTask" show-wiki-link />
      <task-objective
        v-if="props.mark.id"
        :objective="objectives.find((obj) => obj.id == props.mark.id)"
      />
    </v-sheet>
  </div>
</template>
<script setup>
  import { computed, defineAsyncComponent, ref } from 'vue';
  import { useTarkovData } from '@/composables/tarkovdata';
  import { logger } from '@/utils/logger';
  const TaskObjective = defineAsyncComponent(() => import('@/features/tasks/TaskObjective'));
  const TaskLink = defineAsyncComponent(() => import('@/features/tasks/TaskLink'));
  const { objectives, tasks } = useTarkovData();
  const props = defineProps({
    mark: {
      type: Object,
      required: true,
    },
    markLocation: {
      type: Object,
      required: true,
    },
    selectedFloor: {
      type: String,
      default: undefined,
    },
    map: {
      type: Object,
      required: true,
    },
  });
  const forceTooltip = ref(false);
  const hoverTooltip = ref(false);
  const forceTooltipToggle = () => {
    forceTooltip.value = !forceTooltip.value;
  };
  const showTooltip = () => {
    hoverTooltip.value = true;
  };
  const hideTooltip = () => {
    hoverTooltip.value = false;
  };
  const tooltipVisible = computed(() => {
    //if (props.mark.floor !== props.selectedFloor) return false;
    return forceTooltip.value || hoverTooltip.value;
  });
  const relatedObjective = computed(() => {
    return objectives.value.find((obj) => obj.id == props.mark.id);
  });
  const relatedTask = computed(() => {
    return tasks.value.find((task) => task.id == relatedObjective.value?.taskId);
  });
  const markerColor = computed(() => {
    return props.mark.users.includes('self') ? 'text-red' : 'text-orange';
  });
  const relativeLocation = computed(() => {
    // Add safety check for bounds
    const bounds = props.map?.svg?.bounds;
    if (
      !bounds ||
      !Array.isArray(bounds) ||
      bounds.length < 2 ||
      !Array.isArray(bounds[0]) ||
      !Array.isArray(bounds[1])
    ) {
      logger.warn('MapMarker: Invalid or missing map bounds for map:', props.map?.name);
      return { leftPercent: 0, topPercent: 0 }; // Return default if bounds are invalid
    }

    // Get original coordinates
    let originalX = props.markLocation.positions[0].x;
    let originalZ = props.markLocation.positions[0].z;

    // Apply coordinate rotation if specified (but keep original bounds)
    const coordinateRotation = props.map?.svg?.coordinateRotation || 0;
    let x = originalX;
    let z = originalZ;

    if (coordinateRotation === 90) {
      // Rotate 90 degrees: (x, z) -> (-z, x)
      x = -originalZ;
      z = originalX;
    } else if (coordinateRotation === 180) {
      // Rotate 180 degrees: (x, z) -> (-x, -z)
      x = -originalX;
      z = -originalZ;
    } else if (coordinateRotation === 270) {
      // Rotate 270 degrees: (x, z) -> (z, -x)
      x = originalZ;
      z = -originalX;
    }

    // Use original bounds (not rotated) - the bounds are in the original coordinate space
    let mapLeft = bounds[0][0];
    let mapTop = bounds[0][1];
    let mapWidth = Math.abs(bounds[1][0] - bounds[0][0]);
    let mapHeight = Math.abs(bounds[1][1] - bounds[0][1]);

    // Prevent division by zero if width or height is 0
    if (mapWidth === 0 || mapHeight === 0) {
      logger.warn('MapMarker: Map width or height is zero for map:', props.map?.name);
      return { leftPercent: 0, topPercent: 0 };
    }

    // Calculate position relative to bounds with proper handling of coordinate direction
    let relativeLeft = Math.abs(x - mapLeft);
    let relativeTop = Math.abs(z - mapTop);
    let relativeLeftPercent = (relativeLeft / mapWidth) * 100;
    let relativeTopPercent = (relativeTop / mapHeight) * 100;

    return {
      leftPercent: relativeLeftPercent,
      topPercent: relativeTopPercent,
    };
  });
  const markerStyle = computed(() => {
    return {
      position: 'absolute',
      top: relativeLocation.value.topPercent + '%',
      left: relativeLocation.value.leftPercent + '%',
      width: '20px',
      height: '20px',
      transform: 'translate(-50%, -50%)',
      // cursor: props.mark.floor === props.selectedFloor ? "pointer" : "inherit",
      // opacity: props.mark.floor === props.selectedFloor ? 1 : 0.2,
      cursor: 'pointer',
      opacity: 1,
    };
  });
  const tooltipStyle = computed(() => {
    return {
      position: 'absolute',
      top: relativeLocation.value.topPercent + '%',
      left: relativeLocation.value.leftPercent + '%',
      transform: 'translate(-50%, -125%)',
      zIndex: 100,
    };
  });
</script>
<style lang="scss">
  .objective-gps-tooltip {
    width: 100%;
  }
</style>
