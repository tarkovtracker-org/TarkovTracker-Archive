<template>
  <div
    :style="markerStyle as any"
    :class="markerColor"
    @mouseenter="showTooltip()"
    @mouseleave="hideTooltip()"
    @click="forceTooltipToggle()"
  >
    <v-icon>{{ tooltipVisible === true ? 'mdi-map-marker-radius' : 'mdi-map-marker' }}</v-icon>
  </div>
  <div v-if="tooltipVisible" :style="tooltipStyle as any">
    <v-sheet class="ma-0 elevation-3 rounded px-1 pt-2" color="primary">
      <task-link v-if="relatedTask" :task="relatedTask" show-wiki-link />
      <task-objective
        v-if="props.mark.id && objectives.find((obj) => obj.id === props.mark.id)"
        :objective="objectives.find((obj) => obj.id === props.mark.id)!"
      />
    </v-sheet>
  </div>
</template>
<script setup lang="ts">
  import { computed, defineAsyncComponent, ref } from 'vue';
  import { useTarkovData } from '@/composables/tarkovdata';
  import { logger } from '@/utils/logger';
  import type { ObjectiveMarker, MapLocation, MapSvgDefinition } from '@/types/models/maps';

  const TaskObjective = defineAsyncComponent(
    () => import('@/components/domain/tasks/TaskObjective.vue')
  );
  const TaskLink = defineAsyncComponent(() => import('@/components/domain/tasks/TaskLink.vue'));
  const { objectives, tasks } = useTarkovData();
  const props = defineProps<{
    mark: ObjectiveMarker;
    markLocation: MapLocation;
    selectedFloor?: string;
    map: { name?: string; svg?: MapSvgDefinition };
  }>();
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
    return objectives.value.find((obj) => obj.id === props.mark.id);
  });
  const relatedTask = computed(() => {
    return tasks.value.find((task) => task.id === relatedObjective.value?.taskId);
  });
  const markerColor = computed(() => {
    return props.mark.users.includes('self') ? 'text-red' : 'text-orange';
  });
  // Helper function to validate map bounds
  const validateMapBounds = (bounds?: number[][]): boolean => {
    return Boolean(
      bounds &&
        Array.isArray(bounds) &&
        bounds.length >= 2 &&
        Array.isArray(bounds[0]) &&
        Array.isArray(bounds[1])
    );
  };

  // Helper function to apply coordinate rotation about the map center
  const applyCoordinateRotation = (
    x: number,
    z: number,
    rotation: number | undefined,
    bounds?: number[][]
  ): { x: number; z: number } => {
    // Add 180° to the rotation angle to fix mirrored placement
    const coordinateRotation = ((rotation ?? 0) + 180) % 360;
    if (!bounds || bounds.length < 2) {
      // Fallback: rotate about origin
      switch (coordinateRotation) {
        case 90:
          return { x: -z, z: x };
        case 180:
          return { x: -x, z: -z };
        case 270:
          return { x: z, z: -x };
        default:
          return { x, z };
      }
    }
    const x1 = bounds[0][0];
    const z1 = bounds[0][1];
    const x2 = bounds[1][0];
    const z2 = bounds[1][1];
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    const dx = x - cx;
    const dz = z - cz;
    switch (coordinateRotation) {
      case 90:
        return { x: cx - dz, z: cz + dx };
      case 180:
        return { x: cx - dx, z: cz - dz };
      case 270:
        return { x: cx + dz, z: cz - dx };
      default:
        return { x, z };
    }
  };

  // Helper function to calculate relative position
  const calculateRelativePosition = (
    x: number,
    z: number,
    bounds: number[][]
  ): { leftPercent: number; topPercent: number } => {
    // Use bounds as provided (directional) to preserve axis orientation from source
    const x1 = bounds[0][0];
    const z1 = bounds[0][1];
    const x2 = bounds[1][0];
    const z2 = bounds[1][1];
    const mapWidth = x2 - x1; // may be negative; preserves handedness
    const mapHeight = z2 - z1; // may be negative; preserves handedness

    logger.info('Bounds (directional):', { x1, x2, z1, z2, mapWidth, mapHeight });

    // Prevent division by zero if width or height is 0
    if (mapWidth === 0 || mapHeight === 0) {
      logger.warn('MapMarker: Map width or height is zero for map:', props.map.name ?? 'unknown');
      return { leftPercent: 0, topPercent: 0 };
    }

    // Calculate position relative to bounds (respecting direction)
    const relativeLeft = x - x1;
    const relativeTop = z - z1;

    return {
      leftPercent: (relativeLeft / mapWidth) * 100,
      topPercent: (relativeTop / mapHeight) * 100,
    };
  };

  // Apply linear transform [a, b, c, d] -> (a*x + b, c*z + d)
  const applyLinearTransform = (
    x: number,
    z: number,
    transform?: number[]
  ): { x: number; z: number } => {
    if (!transform || transform.length < 4) return { x, z };
    const [a, b, c, d] = transform;
    return { x: a * x + b, z: c * z + d };
  };

  // Transform bounds corners with the same linear transform
  const transformBounds = (bounds: number[][], transform?: number[]): number[][] => {
    if (!transform || transform.length < 4) return bounds;
    const [x1, z1] = bounds[0];
    const [x2, z2] = bounds[1];
    const p1 = applyLinearTransform(x1, z1, transform);
    const p2 = applyLinearTransform(x2, z2, transform);
    return [
      [p1.x, p1.z],
      [p2.x, p2.z],
    ];
  };

  const relativeLocation = computed(() => {
    // Validate bounds
    const mapSvg = props.map.svg;
    const bounds = mapSvg?.bounds;
    if (!validateMapBounds(bounds)) {
      // logger.warn('MapMarker: Invalid or missing map bounds for map:', props.map.name ?? 'unknown');
      return { leftPercent: 0, topPercent: 0 };
    }

    // Get original coordinates
    const originalX = props.markLocation.positions[0].x;
    const originalZ = props.markLocation.positions[0].z;

    // Apply coordinate rotation
    const rotated = applyCoordinateRotation(
      originalX,
      originalZ,
      mapSvg?.coordinateRotation,
      bounds!
    );

    // Apply CRS-like transform (scale + margin) if available
    const transform = (mapSvg as any)?.transform as number[] | undefined;
    const transformed = applyLinearTransform(rotated.x, rotated.z, transform);

    // Use transformed bounds for relative calculation
    const effectiveBounds = transformBounds(bounds!, transform);

    // Calculate relative position
    const result = calculateRelativePosition(transformed.x, transformed.z, effectiveBounds);

    return result;
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
