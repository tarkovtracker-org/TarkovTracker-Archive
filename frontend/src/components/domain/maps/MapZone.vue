<template>
  <div
    :style="zoneStyle"
    :class="zoneColor"
    @mouseenter="showTooltip()"
    @mouseleave="hideTooltip()"
    @click="forceTooltipToggle()"
  ></div>
  <div v-if="tooltipVisible" :style="tooltipStyle">
    <v-sheet class="ma-0 elevation-3 rounded px-1 pt-2" color="primary">
      <task-link v-if="relatedTask" :task="relatedTask" show-wiki-link />
      <task-objective
        v-if="props.mark.id"
        :objective="objectives.find((obj) => obj.id === props.mark.id)!"
      />
    </v-sheet>
  </div>
</template>
<script setup lang="ts">
  import { computed, defineAsyncComponent, ref } from 'vue';
  import type { CSSProperties } from 'vue';
  import type { TaskObjective, Task } from '@/types/models/tarkov';
  import { useTarkovData } from '@/composables/tarkovdata';
  import { logger } from '@/utils/logger';
  const TaskObjective = defineAsyncComponent(
    () => import('@/components/domain/tasks/TaskObjective.vue')
  );
  const TaskLink = defineAsyncComponent(() => import('@/components/domain/tasks/TaskLink.vue'));
  const { objectives, tasks } = useTarkovData();
  interface Mark {
    id?: string;
    users: string[];
    floor?: string;
  }

  interface ZoneLocation {
    outline: Array<{ x: number; z: number }>;
  }

  interface MapData {
    svg?:
      | string
      | {
          bounds: number[][];
          coordinateRotation: number;
          file?: string;
          floors?: string[];
          defaultFloor?: string;
          transform?: number[];
          heightRange?: number[];
        };
  }

  const props = defineProps<{
    mark: Mark;
    zoneLocation: ZoneLocation;
    selectedFloor?: string;
    map: MapData;
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
    return objectives.value.find((obj: TaskObjective) => obj.id === props.mark.id);
  });
  const relatedTask = computed(() => {
    return tasks.value.find((task: Task) => task.id === relatedObjective.value?.taskId);
  });
  const zoneColor = computed(() => {
    if (tooltipVisible.value) return 'text-green';
    return props.mark.users.includes('self') ? 'text-red' : 'text-orange';
  });
  const relativeLocation = computed(() => {
    // Determine the leftmost x position in the array of zone positions
    // Take the bounds of the map and figure out the initial relative position
    if (!props.map.svg || typeof props.map.svg === 'string') {
      return {
        leftPercent: 0,
        topPercent: 0,
        rightPercent: 0,
        bottomPercent: 0,
        internalPercents: [],
      };
    }
    // Normalize bounds to ensure left < right and top < bottom
    const x1 = props.map.svg.bounds[0][0];
    const z1 = props.map.svg.bounds[0][1];
    const x2 = props.map.svg.bounds[1][0];
    const z2 = props.map.svg.bounds[1][1];

    // Apply CRS-like transform to bounds if present
    const transform = props.map.svg.transform as number[] | undefined;
    const applyTransform = (x: number, z: number): { x: number; z: number } => {
      if (!transform || transform.length < 4) return { x, z };
      const [a, b, c, d] = transform;
      return { x: a * x + b, z: c * z + d };
    };
    const p1 = applyTransform(x1, z1);
    const p2 = applyTransform(x2, z2);
    const tx1 = p1.x;
    const tz1 = p1.z;
    const tx2 = p2.x;
    const tz2 = p2.z;
    const mapWidth = tx2 - tx1; // directional
    const mapHeight = tz2 - tz1; // directional

    // Apply coordinate rotation to the outline points
    const coordinateRotation = props.map.svg.coordinateRotation;

    const outlinePercents: Array<{ leftPercent: number; topPercent: number }> = [];
    // Center of (transformed) bounds for pivot rotation
    const cx = (tx1 + tx2) / 2;
    const cz = (tz1 + tz2) / 2;
    props.zoneLocation.outline.forEach((outline) => {
      // Get original coordinates
      const originalX = outline.x;
      const originalZ = outline.z;

      // Apply coordinate rotation if specified, adding 180° to fix mirrored placement
      let x = originalX;
      let z = originalZ;
      const adjustedRotation = ((coordinateRotation ?? 0) + 180) % 360;
      if (adjustedRotation === 90) {
        const dx = originalX - (x1 + x2) / 2;
        const dz = originalZ - (z1 + z2) / 2;
        x = (x1 + x2) / 2 - dz;
        z = (z1 + z2) / 2 + dx;
      } else if (adjustedRotation === 180) {
        const dx = originalX - (x1 + x2) / 2;
        const dz = originalZ - (z1 + z2) / 2;
        x = (x1 + x2) / 2 - dx;
        z = (z1 + z2) / 2 - dz;
      } else if (adjustedRotation === 270) {
        const dx = originalX - (x1 + x2) / 2;
        const dz = originalZ - (z1 + z2) / 2;
        x = (x1 + x2) / 2 + dz;
        z = (z1 + z2) / 2 - dx;
      }

      // Apply transform to the coordinates after rotation, to align with image assets
      const t = applyTransform(x, z);

      // Calculate relative values using the coordinate system of the map
      const relativeLeft = t.x - tx1;
      const relativeTop = t.z - tz1;
      // Calculate relative values relative to the map container
      const relativeLeftPercent = (relativeLeft / mapWidth) * 100;
      const relativeTopPercent = (relativeTop / mapHeight) * 100;
      outlinePercents.push({
        leftPercent: relativeLeftPercent,
        topPercent: relativeTopPercent,
      });
    });
    // Find the bounds of the outline
    const leftPercent = outlinePercents.reduce((min, current) => {
      return current.leftPercent < min ? current.leftPercent : min;
    }, outlinePercents[0].leftPercent);
    const topPercent = outlinePercents.reduce((min, current) => {
      return current.topPercent < min ? current.topPercent : min;
    }, outlinePercents[0].topPercent);
    const rightPercent = outlinePercents.reduce((max, current) => {
      return current.leftPercent > max ? current.leftPercent : max;
    }, outlinePercents[0].leftPercent);
    const bottomPercent = outlinePercents.reduce((max, current) => {
      return current.topPercent > max ? current.topPercent : max;
    }, outlinePercents[0].topPercent);
    // Now, calculate the percentages internally to the div based on the bounds
    const internalPercents: Array<{ leftPercent: number; topPercent: number }> = [];
    outlinePercents.forEach((outline) => {
      const internalLeftPercent =
        ((outline.leftPercent - leftPercent) / (rightPercent - leftPercent)) * 100;
      const internalTopPercent =
        ((outline.topPercent - topPercent) / (bottomPercent - topPercent)) * 100;
      internalPercents.push({
        leftPercent: internalLeftPercent,
        topPercent: internalTopPercent,
      });
    });
    return {
      leftPercent,
      topPercent,
      rightPercent,
      bottomPercent,
      internalPercents,
    };
  });

  const zoneStyle = computed(
    (): CSSProperties => ({
      position: 'absolute' as const,
      top: relativeLocation.value.topPercent + '%',
      left: relativeLocation.value.leftPercent + '%',
      width: relativeLocation.value.rightPercent - relativeLocation.value.leftPercent + '%',
      height: relativeLocation.value.bottomPercent - relativeLocation.value.topPercent + '%',
      clipPath:
        'polygon(' +
        relativeLocation.value.internalPercents
          .map((point) => {
            return point.leftPercent + '% ' + point.topPercent + '%';
          })
          .join(', ') +
        ')',
      background: tooltipVisible.value
        ? 'linear-gradient(90deg, rgba(155, 165, 0, 0.5) 0%, rgba(155, 165, 0, 0.5) 100%)'
        : 'linear-gradient(90deg, rgba(255, 165, 0, 0.2) 0%, rgba(255, 165, 0, 0.2) 100%)',
      borderStyle: 'dashed' as const,
      // cursor: props.mark.floor === props.selectedFloor ? "pointer" : "inherit",
      // opacity: props.mark.floor === props.selectedFloor ? 1 : 0.2,
      cursor: 'pointer' as const,
      opacity: 1,
    })
  );
  const tooltipStyle = computed(
    (): CSSProperties => ({
      position: 'absolute' as const,
      top: relativeLocation.value.topPercent + '%',
      left: relativeLocation.value.leftPercent + '%',
      transform: 'translate(-50%, -125%)',
      zIndex: 100,
    })
  );
</script>
<style lang="scss">
  .objective-gps-tooltip {
    width: 100%;
  }
</style>
