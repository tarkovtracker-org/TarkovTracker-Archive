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
                      :map="props.map"
                    />
                  </template>
                </template>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="map-placeholder">
          <v-alert
            type="warning"
            color="warning"
            variant="outlined"
            density="comfortable"
            icon="mdi-alert"
            class="map-placeholder-alert"
          >
            {{ mapUnavailableMessage }}
          </v-alert>
        </div>
        <v-alert
          v-if="mapLoadError"
          type="error"
          color="error"
          variant="outlined"
          density="comfortable"
          icon="mdi-alert-circle"
          class="map-error-alert"
          closable
          @click:close="mapLoadError = null"
        >
          {{ mapLoadError }}
        </v-alert>
        <div v-if="mapHasSvg && svgFloors.length > 1" class="floor-controls">
          <v-btn-group direction="vertical" density="compact">
            <v-btn
              v-for="(floor, floorIndex) in svgFloors"
              :key="floorIndex"
              size="small"
              :color="floor === selectedFloor ? 'primary' : ''"
              :variant="floor === selectedFloor ? 'flat' : 'tonal'"
              class="floor-button"
              @click="setFloor(floor)"
            >
              {{ formatFloorLabel(floor) }}
            </v-btn>
          </v-btn-group>
        </div>
        <div v-if="mapHasSvg" class="zoom-controls">
          <v-btn-group direction="vertical" density="compact">
            <v-btn
              icon="mdi-plus"
              size="small"
              :disabled="currentZoom >= maxZoom"
              title="Zoom In"
              @click="zoomIn"
            />
            <v-btn
              icon="mdi-minus"
              size="small"
              :disabled="currentZoom <= minZoom"
              title="Zoom Out"
              @click="zoomOut"
            />
            <v-btn icon="mdi-restore" size="small" title="Reset View" @click="resetZoom" />
          </v-btn-group>
        </div>
        <div v-if="mapHasSvg && currentZoom !== 1" class="zoom-indicator">
          {{ Math.round(currentZoom * 100) }}%
        </div>
        <transition name="fade">
          <div v-if="mapHasSvg && showScrollHint" class="scroll-hint">Use Alt+Scroll to zoom</div>
        </transition>
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
  import * as d3 from 'd3';
  import type { TarkovMap } from '@/types/models/tarkov';
  import type {
    MapSvgDefinition,
    ObjectiveMarker,
    MapZone as MapZoneDefinition,
  } from '@/types/models/maps';
  import { logger } from '@/utils/logger';
  import { useMapZoom } from '@/composables/maps/useMapZoom';
  import { parseMapFileName, getMapSvgUrl, formatFloorLabel } from '@/utils/mapUtils';
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
    ...(props.floorOpacity ?? {}),
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
  const svgElement = ref<SVGSVGElement | null>(null);
  const svgCache = ref(new Map<string, SVGSVGElement>());
  const svgUrlCache = ref(new Map<string, string>());
  const mapSvg = computed<MapSvgDefinition | undefined>(() => {
    const svg = props.map?.svg;
    if (svg && typeof svg === 'object') {
      return svg as MapSvgDefinition;
    }
    return undefined;
  });
  const mapHasSvg = computed(() => {
    const svg = props.map?.svg;
    if (!svg) return false;
    if (typeof svg === 'string') {
      return svg.trim().length > 0;
    }
    return Boolean(svg.file);
  });
  const mapUnavailableMessage = computed(() => {
    if (mapHasSvg.value) return '';
    return props.map?.unavailableMessage ?? 'Map data is not available for this location yet.';
  });
  const svgFloors = computed(() => mapSvg.value?.floors ?? []);
  const initialFloor = computed(() => {
    if (!mapSvg.value) return undefined;
    return mapSvg.value.defaultFloor ?? svgFloors.value[svgFloors.value.length - 1];
  });
  const selectedFloor = ref<string | undefined>(initialFloor.value);
  const svgFileName = computed(() => {
    const svg = props.map?.svg;
    if (typeof svg === 'string') {
      return svg;
    }
    const baseFile = svg?.file;
    if (!baseFile) return undefined;
    const floors = svgFloors.value;
    if (floors.length > 1 && selectedFloor.value) {
      return parseMapFileName(baseFile, selectedFloor.value);
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
  const setFloor = (floor: string) => {
    selectedFloor.value = floor;
    if (mapHasSvg.value) {
      const floors = svgFloors.value;
      if (floors.length > 1) {
        const mapContainer = document.getElementById(randomMapId.value);
        const wrapper = mapContainer?.querySelector('.map-content-wrapper') as HTMLElement | null;
        const existingSvgs = wrapper?.querySelectorAll('svg');
        if (existingSvgs && existingSvgs.length === floors.length && wrapper) {
          const selectedFloorIndex = floors.indexOf(floor);
          updateFloorOpacity(wrapper, selectedFloorIndex);
          return;
        }
      }
      draw();
    }
  };
  watch(initialFloor, (floor) => {
    selectedFloor.value = floor;
  });
  const currentMapId = ref<string | undefined>(undefined);
  watch(
    () => props.map,
    (newMap) => {
      if (newMap?.id !== currentMapId.value) {
        const mapContainer = document.getElementById(randomMapId.value);
        if (mapContainer) {
          const wrapper = mapContainer.querySelector('.map-content-wrapper') as HTMLElement;
          if (wrapper) {
            wrapper.querySelectorAll('svg').forEach((node) => node.remove());
          }
        }
        svgCache.value.clear();
        svgUrlCache.value.clear();
        teardownZoom();
        currentMapId.value = newMap?.id;
      }
      if (!mapHasSvg.value) {
        teardownZoom();
        return;
      }
      draw();
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
    draw();
  });
  const draw = async () => {
    if (!mapHasSvg.value) {
      return;
    }
    const mapContainer = document.getElementById(randomMapId.value);
    if (!mapContainer) return;
    const wrapper = mapContainer.querySelector('.map-content-wrapper') as HTMLElement;
    if (!wrapper) return;
    const floors = svgFloors.value;
    if (floors.length > 1) {
      const svg = props.map?.svg;
      if (typeof svg === 'string' || !svg?.file) {
        logger.warn('Map SVG file info missing, skipping draw.');
        return;
      }
      await drawMultiFloorMap(wrapper, floors, svg.file);
    } else {
      const fileName = svgFileName.value;
      if (!fileName) {
        logger.warn('Map SVG file info missing, skipping draw.');
        return;
      }
      await drawStandardMap(mapContainer, fileName);
    }
  };
  const drawMultiFloorMap = async (
    wrapper: HTMLElement,
    floors: string[],
    baseFile: string
  ): Promise<void> => {
    const match = baseFile.match(/^(.+?)(-[\w_]+)?\.svg$/);
    if (!match) {
      logger.warn('Could not parse base file name:', baseFile);
      return;
    }
    const baseName = match[1];
    const selectedFloorIndex = selectedFloor.value
      ? floors.indexOf(selectedFloor.value)
      : floors.length - 1;
    const existingSvgs = wrapper.querySelectorAll('svg[data-floor-layer]');
    const allFloorsLoaded = existingSvgs.length === floors.length;
    if (allFloorsLoaded) {
      updateFloorOpacity(wrapper, selectedFloorIndex);
    } else {
      await loadAllFloors(wrapper, floors, baseName, selectedFloorIndex);
      updateFloorOpacity(wrapper, selectedFloorIndex);
    }
  };
  const loadAllFloors = async (
    wrapper: HTMLElement,
    floors: string[],
    baseName: string,
    selectedFloorIndex: number
  ): Promise<void> => {
    for (let i = 0; i < floors.length; i++) {
      const floor = floors[i];
      const floorFileName = `${baseName}-${floor}.svg`;
      let opacity = effectiveFloorOpacity.value.SELECTED;
      const isMainLayer = i === selectedFloorIndex;
      const isFirstLayer = i === 0;
      if (i < selectedFloorIndex) {
        opacity = effectiveFloorOpacity.value.BELOW;
      } else if (isMainLayer) {
        opacity = effectiveFloorOpacity.value.SELECTED;
      } else {
        opacity = effectiveFloorOpacity.value.ABOVE;
      }
      const loadedSvg = await drawFloorLayer(
        wrapper,
        floorFileName,
        opacity,
        isMainLayer,
        isFirstLayer
      );
      if (isMainLayer && loadedSvg) {
        svgElement.value = loadedSvg;
      }
    }
    if (svgElement.value) {
      const mapContainer = document.getElementById(randomMapId.value);
      if (mapContainer?.parentElement) {
        initializeZoom({
          wrapper,
          viewport: mapContainer.parentElement,
          mapContainerId: randomMapId.value,
        });
      }
    }
  };
  const updateFloorOpacity = (wrapper: HTMLElement, selectedFloorIndex: number) => {
    const svgs = wrapper.querySelectorAll<SVGSVGElement>('svg[data-floor-layer="true"]');
    svgs.forEach((svg, index) => {
      let opacity = effectiveFloorOpacity.value.SELECTED;
      const isMainLayer = index === selectedFloorIndex;
      if (index < selectedFloorIndex) {
        opacity = effectiveFloorOpacity.value.BELOW;
      } else if (isMainLayer) {
        opacity = effectiveFloorOpacity.value.SELECTED;
      } else {
        opacity = effectiveFloorOpacity.value.ABOVE;
      }
      svg.style.opacity = opacity.toString();
      if (isMainLayer) {
        svg.dataset.mainLayer = 'true';
        svg.style.pointerEvents = 'auto';
        svgElement.value = svg;
      } else {
        svg.dataset.mainLayer = 'false';
        svg.style.pointerEvents = 'none';
      }
    });
  };
  const drawFloorLayer = async (
    wrapper: HTMLElement,
    fileName: string,
    opacity: number,
    _isMainLayer: boolean = false,
    isFirstLayer: boolean = false
  ): Promise<SVGSVGElement | null> => {
    if (svgCache.value.has(fileName)) {
      const cachedSvg = svgCache.value.get(fileName)!;
      cachedSvg.style.opacity = opacity.toString();
      cachedSvg.removeAttribute('data-main-layer');
      if (!wrapper.contains(cachedSvg)) {
        wrapper.appendChild(cachedSvg);
      }
      return cachedSvg;
    }
    const cacheKey = `${props.map.name}|${fileName}`;
    let svgUrl = svgUrlCache.value.get(cacheKey);
    if (!svgUrl) {
      svgUrl = getMapSvgUrl(fileName, props.map.name);
      svgUrlCache.value.set(cacheKey, svgUrl);
    }
    try {
      const svg = await d3.svg(svgUrl);
      const rootElement = svg.documentElement;
      if (!(rootElement instanceof SVGSVGElement)) {
        logger.warn('Unexpected SVG root element', rootElement);
        return null;
      }
      rootElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      rootElement.setAttribute('data-floor-file', fileName);
      rootElement.setAttribute('data-floor-layer', 'true');
      rootElement.style.width = '100%';
      rootElement.style.height = 'auto';
      rootElement.style.display = 'block';
      if (isFirstLayer) {
        rootElement.style.position = 'relative';
      } else {
        rootElement.style.position = 'absolute';
        rootElement.style.top = '0';
        rootElement.style.left = '0';
      }
      rootElement.style.opacity = opacity.toString();
      rootElement.style.pointerEvents = 'none';
      rootElement.removeAttribute('data-main-layer');
      rootElement.style.zIndex = '0';
      svgCache.value.set(fileName, rootElement);
      wrapper.appendChild(rootElement);
      return rootElement;
    } catch (err) {
      logger.error(`Failed to load floor: ${fileName}`, err);
      mapLoadError.value = `Failed to load map floor: ${fileName}. Please try refreshing the page.`;
      return null;
    }
  };
  const drawStandardMap = async (mapContainer: HTMLElement, fileName: string) => {
    const cacheKey = `${props.map.name}|${fileName}`;
    let svgUrl = svgUrlCache.value.get(cacheKey);
    if (!svgUrl) {
      svgUrl = getMapSvgUrl(fileName, props.map.name);
      svgUrlCache.value.set(cacheKey, svgUrl);
    }
    try {
      const svg = await d3.svg(svgUrl);
      const rootElement = svg.documentElement;
      if (!(rootElement instanceof SVGSVGElement)) {
        logger.warn('Unexpected SVG root element', rootElement);
        return;
      }
      svgElement.value = rootElement;
      svgElement.value.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svgElement.value.style.width = '100%';
      svgElement.value.style.height = 'auto';
      svgElement.value.style.display = 'block';
      const wrapper = mapContainer.querySelector('.map-content-wrapper') as HTMLElement;
      if (wrapper) {
        wrapper.appendChild(svgElement.value);
      } else {
        mapContainer.appendChild(svgElement.value);
      }
      if (mapContainer.parentElement) {
        initializeZoom({
          wrapper: wrapper || mapContainer,
          viewport: mapContainer.parentElement,
          mapContainerId: randomMapId.value,
        });
      }
      const floors = svgFloors.value;
      if (selectedFloor.value && floors && floors.length > 0 && svgElement.value) {
        const selectedFloorIndex = floors.indexOf(selectedFloor.value);
        if (selectedFloorIndex !== -1) {
          const svg = svgElement.value;
          floors.forEach((floor: string, index: number) => {
            if (index > selectedFloorIndex) {
              const floorElement = svg.querySelector<SVGGraphicsElement>(`#${floor}`);
              if (floorElement) {
                floorElement.style.opacity = effectiveFloorOpacity.value.ABOVE.toString();
              }
            }
          });
        }
      }
    } catch (err) {
      logger.error(`Failed to load map: ${fileName}`, err);
      mapLoadError.value = `Failed to load map: ${fileName}. Please try refreshing the page.`;
    }
  };
  onMounted(() => {
    currentMapId.value = props.map?.id;
    if (mapHasSvg.value) {
      draw();
    }
  });
  onBeforeUnmount(() => {
    teardownZoom();
    svgCache.value.clear();
    svgUrlCache.value.clear();
  });
</script>
<style lang="scss" scoped src="./TarkovMap.scss"></style>
