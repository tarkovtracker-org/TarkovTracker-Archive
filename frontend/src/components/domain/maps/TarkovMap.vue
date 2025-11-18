<template>
  <v-container>
    <v-row>
      <v-col cols="12" style="position: relative">
        <div v-if="mapHasSvg" class="map-viewport">
          <div :id="randomMapId" class="map-container">
            <div class="map-content-wrapper">
              <div class="markers-overlay">
                <MapZone
                  v-for="(zone, zoneLocationIndex) in sortedZones"
                  :key="zoneLocationIndex"
                  :mark="zone.mark"
                  :zone-location="zone.zone"
                  :selected-floor="selectedFloor"
                  :map="props.map"
                />
                <template v-for="(mark, markIndex) in props.marks" :key="markIndex">
                  <template
                    v-for="(markLocation, markLocationIndex) in mark.possibleLocations"
                    :key="markLocationIndex"
                  >
                    <MapMarker
                      v-if="markLocation.map.id === props.map.id"
                      :key="markLocationIndex"
                      :mark="mark"
                      :mark-location="markLocation"
                      :selected-floor="selectedFloor"
                      :map="props.map as any"
                    />
                  </template>
                </template>
              </div>
            </div>
          </div>
        </div>

        <MapPlaceholder v-else :message="mapUnavailableMessage" />

        <MapErrorAlert :error="mapLoadError" @close="mapLoadError = null" />

        <FloorControls
          v-if="mapHasSvg && svgFloors.length > 1 && selectedFloor"
          :floors="svgFloors"
          :selected-floor="selectedFloor"
          @floor-change="setFloor"
        />

        <ZoomControls
          v-if="mapHasSvg"
          :current-zoom="currentZoom"
          :min-zoom="minZoom"
          :max-zoom="maxZoom"
          @zoom-in="zoomIn"
          @zoom-out="zoomOut"
          @reset-zoom="resetZoom"
        />

        <ZoomIndicator
          v-if="mapHasSvg"
          :current-zoom="currentZoom"
          :show-indicator="currentZoom !== 1"
        />

        <MapScrollHint v-if="mapHasSvg" :show-hint="showScrollHint" />
      </v-col>
    </v-row>
  </v-container>
</template>
<script setup lang="ts">
  import {
    ref,
    onMounted,
    onBeforeUnmount,
    watch,
    defineAsyncComponent,
    withDefaults,
    computed,
  } from 'vue';
  import { v4 as uuidv4 } from 'uuid';
  import type { TarkovMap } from '@/types/models/tarkov';
  import type { ObjectiveMarker, MapZone as MapZoneDefinition } from '@/types/models/maps';
  import { logger } from '@/utils/logger';
  import { useMapZoom } from '@/composables/maps/useMapZoom';
  import { useMapSvg } from '@/composables/maps/useMapSvg';
  import { useMapDrawing } from '@/composables/maps/useMapDrawing';

  // Import new UI components
  import MapPlaceholder from '@/components/ui/MapPlaceholder.vue';
  import MapErrorAlert from '@/components/ui/MapErrorAlert.vue';
  import FloorControls from '@/components/ui/FloorControls.vue';
  import ZoomControls from '@/components/ui/ZoomControls.vue';
  import ZoomIndicator from '@/components/ui/ZoomIndicator.vue';
  import MapScrollHint from '@/components/ui/MapScrollHint.vue';

  type FloorOpacity = {
    BELOW: number;
    SELECTED: number;
    ABOVE: number;
  };

  const DEFAULT_FLOOR_OPACITY: FloorOpacity = {
    BELOW: 0.4,
    SELECTED: 1.0,
    ABOVE: 0.05,
  };

  interface Props {
    map: TarkovMap;
    marks?: ObjectiveMarker[];
    floorOpacity?: Partial<FloorOpacity>;
  }

  const randomMapId = ref(uuidv4());
  const props = withDefaults(defineProps<Props>(), {
    marks: () => [] as ObjectiveMarker[],
    floorOpacity: undefined,
  });

  const effectiveFloorOpacity = computed<FloorOpacity>(() => ({
    ...DEFAULT_FLOOR_OPACITY,
    ...props.floorOpacity,
  }));

  const MapMarker = defineAsyncComponent(() => import('@/components/domain/maps/MapMarker.vue'));
  const MapZone = defineAsyncComponent(() => import('@/components/domain/maps/MapZone.vue'));

  const mapLoadError = ref<string | null>(null);

  const {
    currentZoom,
    showScrollHint,
    minZoom,
    maxZoom,
    initializeZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    teardownZoom,
  } = useMapZoom({
    minZoom: 1,
    maxZoom: 5,
  });

  // Use map SVG composable
  const {
    svgElement,
    mapHasSvg,
    mapUnavailableMessage,
    svgFloors,
    selectedFloor,
    setFloor,
    clearCache,
  } = useMapSvg({
    map: computed(() => props.map),
    onSvgLoad: (_svg) => {
      // Initialize zoom after SVG loads
      const mapContainer = document.getElementById(randomMapId.value);
      if (mapContainer?.parentElement) {
        initializeZoom({
          wrapper: mapContainer,
          viewport: mapContainer.parentElement,
          mapContainerId: randomMapId.value,
        });
      }
    },
    onSvgError: (error) => {
      mapLoadError.value = error;
    },
  });

  // Use map drawing composable
  const { drawStandardMap, drawMultiFloorMap } = useMapDrawing({
    mapName: props.map.name,
    floors: svgFloors.value,
    selectedFloor,
    effectiveFloorOpacity,
    randomMapId: randomMapId.value,
    onSvgLoad: (svg) => {
      svgElement.value = svg;
    },
  });

  const svgFileName = computed(() => {
    const { svg } = props.map;
    if (typeof svg === 'string') return svg;
    // If svg is an object with file property, use that
    const baseFile = (svg as { file?: string }).file;
    if (!baseFile) return undefined;
    const floors = svgFloors.value;
    if (floors.length > 1 && selectedFloor.value) {
      // Multi-floor logic would go here if needed
      return baseFile;
    }
    return baseFile;
  });
  // Shoelace formula for polygon area
  const polygonArea = (points: { x: number; z: number }[]) => {
    let area = 0;
    let j = points.length - 1;
    for (let i = 0; i < points.length; i++) {
      area += (points[j].x + points[i].x) * (points[j].z - points[i].z);
      j = i;
    }
    return Math.abs(area / 2);
  };
  const sortedZones = computed(() => {
    const zones: { zone: MapZoneDefinition; mark: ObjectiveMarker }[] = [];
    for (const mark of props.marks) {
      for (const zone of mark.zones ?? []) {
        if (zone.map.id === props.map.id) {
          zones.push({ zone, mark });
        }
      }
    }
    return zones.toSorted((a, b) => polygonArea(b.zone.outline) - polygonArea(a.zone.outline));
  });
  const currentMapId = ref<string | undefined>(undefined);
  watch(
    () => props.map,
    (newMap) => {
      if (newMap.id !== currentMapId.value) {
        const mapContainer = document.getElementById(randomMapId.value);
        if (mapContainer) {
          const wrapper = mapContainer.querySelector('.map-content-wrapper') as HTMLElement;
          wrapper.querySelectorAll('svg').forEach((node) => node.remove());
        }
        clearCache();
        teardownZoom();
        currentMapId.value = newMap.id;
      }
      void draw();
    }
  );
  watch(mapHasSvg, (hasSvg) => {
    if (!hasSvg) {
      const mapContainer = document.getElementById(randomMapId.value);
      const wrapper = mapContainer?.querySelector('.map-content-wrapper') as HTMLElement | null;
      wrapper?.querySelectorAll('svg').forEach((node) => node.remove());
      teardownZoom();
      return;
    }
    void draw();
  });
  const draw = async () => {
    const mapContainer = document.getElementById(randomMapId.value);
    if (!mapContainer) return;
    const wrapper = mapContainer.querySelector('.map-content-wrapper') as HTMLElement;
    const floors = svgFloors.value;
    if (floors.length > 1) {
      const { svg } = props.map;
      if (typeof svg === 'string' || !svg?.file) {
        logger.warn('Map SVG file info missing, skipping draw.');
        return;
      }
      logger.info('Drawing multi-floor map', { map: props.map.name, file: svg.file, floors });
      await drawMultiFloorMap(wrapper, floors, svg.file);
    } else {
      const fileName = svgFileName.value;
      if (!fileName) {
        logger.warn('Map SVG file info missing, skipping draw.');
        return;
      }
      logger.info('Drawing single-floor map', { map: props.map.name, file: fileName, floors });
      await drawStandardMap(wrapper, fileName);
    }
  };
  onMounted(() => {
    currentMapId.value = props.map.id;
    if (mapHasSvg.value) {
      void draw();
    }
  });
  onBeforeUnmount(() => {
    teardownZoom();
    clearCache();
  });
</script>
<style lang="scss" scoped src="./TarkovMap.scss"></style>
