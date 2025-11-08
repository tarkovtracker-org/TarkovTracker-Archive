<template>
  <v-container>
    <v-row>
      <v-col cols="12" style="position: relative">
        <div v-if="mapHasSvg" class="map-viewport">
          <div :id="randomMapId" class="map-container">
            <div class="map-content-wrapper">
              <!-- SVG layers are loaded here by draw() -->
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

        <!-- Map Loading Error Alert -->
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

        <!-- Floor/Layer Controls -->
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

        <!-- Zoom Controls -->
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

        <!-- Zoom Indicator -->
        <div v-if="mapHasSvg && currentZoom !== 1" class="zoom-indicator">
          {{ Math.round(currentZoom * 100) }}%
        </div>

        <!-- Scroll Hint -->
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
  import type { TarkovMap } from '@/types/tarkov';
  import type {
    MapSvgDefinition,
    ObjectiveMarker,
    MapZone as MapZoneDefinition,
  } from '@/types/maps';
  import { logger } from '@/utils/logger';
  import { useMapZoom } from '@/composables/maps/useMapZoom';
  import { parseMapFileName, getMapSvgUrl, formatFloorLabel } from '@/utils/mapUtils';

  /**
   * Opacity settings for multi-floor map rendering.
   * These values visually distinguish the selected floor (fully opaque),
   * floors below (partially visible), and floors above (barely visible).
   * Adjust for UX or accessibility needs; this can be overridden via props.
   */
  type FloorOpacity = {
    BELOW: number; // Floors below the selected floor are partially visible
    SELECTED: number; // Selected floor is fully opaque
    ABOVE: number; // Floors above the selected floor are barely visible
  };

  /**
   * Default opacity settings for multi-floor maps.
   * BELOW: Dim but visible
   * SELECTED: Fully visible
   * ABOVE: Barely visible to reduce visual clutter
   */
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
  const MapMarker = defineAsyncComponent(() => import('@/features/maps/MapMarker.vue'));
  const MapZone = defineAsyncComponent(() => import('@/features/maps/MapZone.vue'));

  // Map loading error state
  const mapLoadError = ref<string | null>(null);

  // Zoom composable
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

  // Cache for loaded SVG elements (to avoid re-fetching)
  const svgCache = ref(new Map<string, SVGSVGElement>());

  // Cache for computed SVG URLs to avoid recomputing per floor per map
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
  const selectedFloor = ref<
    string | undefined // Changed from string | null
  >(initialFloor.value);

  const svgFileName = computed(() => {
    const svg = props.map?.svg;
    if (typeof svg === 'string') {
      return svg;
    }

    const baseFile = svg?.file;
    if (!baseFile) return undefined;

    // If there are multiple floors and a floor is selected, construct the filename
    const floors = svgFloors.value;
    if (floors.length > 1 && selectedFloor.value) {
      return parseMapFileName(baseFile, selectedFloor.value);
    }

    return baseFile;
  });

  // trapezoidal form of the shoelace formula
  // https://en.wikipedia.org/wiki/Shoelace_formula
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
      // If multi-floor map and floors are already loaded, just update opacity
      if (floors.length > 1) {
        const mapContainer = document.getElementById(randomMapId.value);
        const wrapper = mapContainer?.querySelector('.map-content-wrapper') as HTMLElement | null;
        const existingSvgs = wrapper?.querySelectorAll('svg');
        if (existingSvgs && existingSvgs.length === floors.length && wrapper) {
          // All floors loaded, just update opacity
          const selectedFloorIndex = floors.indexOf(floor);
          updateFloorOpacity(wrapper, selectedFloorIndex);
          return;
        }
      }
      // Otherwise do a full draw
      draw();
    }
  };
  watch(initialFloor, (floor) => {
    selectedFloor.value = floor;
  });

  // Track current map to detect map changes (vs floor changes)
  const currentMapId = ref<string | undefined>(undefined);

  watch(
    () => props.map,
    (newMap) => {
      // Clear wrapper when switching to a different map
      if (newMap?.id !== currentMapId.value) {
        const mapContainer = document.getElementById(randomMapId.value);
        if (mapContainer) {
          const wrapper = mapContainer.querySelector('.map-content-wrapper') as HTMLElement;
          if (wrapper) {
            wrapper.querySelectorAll('svg').forEach((node) => node.remove());
          }
        }
        // Clear caches to avoid stale cross-map data
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

    // If there are multiple floors, load and stack all of them
    if (floors.length > 1) {
      const svg = props.map?.svg;
      if (typeof svg === 'string' || !svg?.file) {
        logger.warn('Map SVG file info missing, skipping draw.');
        return;
      }

      await drawMultiFloorMap(wrapper, floors, svg.file);
    } else {
      // Single floor or no floor info - load the single file
      const fileName = svgFileName.value;
      if (!fileName) {
        logger.warn('Map SVG file info missing, skipping draw.');
        return;
      }
      await drawStandardMap(mapContainer, fileName);
    }
  };

  /**
   * Handle multi-floor map rendering
   */
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

    // Check if all floors are already loaded (in cache or DOM)
    const existingSvgs = wrapper.querySelectorAll('svg[data-floor-layer]');
    const allFloorsLoaded = existingSvgs.length === floors.length;

    if (allFloorsLoaded) {
      // Just update opacity without re-fetching
      updateFloorOpacity(wrapper, selectedFloorIndex);
    } else {
      // Initial load - fetch and add all floors
      await loadAllFloors(wrapper, floors, baseName, selectedFloorIndex);
    }
  };

  /**
   * Load all floor layers for a multi-floor map
   */
  const loadAllFloors = async (
    wrapper: HTMLElement,
    floors: string[],
    baseName: string,
    selectedFloorIndex: number
  ): Promise<void> => {
    for (let i = 0; i < floors.length; i++) {
      const floor = floors[i];
      const floorFileName = `${baseName}-${floor}.svg`;

      // Calculate opacity based on position relative to selected floor
      // Floors below are dimmed, selected floor is fully opaque, floors above are barely visible.
      let opacity = effectiveFloorOpacity.value.SELECTED;
      const isMainLayer = i === selectedFloorIndex;
      const isFirstLayer = i === 0; // First layer defines wrapper height

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

      // Store the main layer as svgElement for zoom reference
      if (isMainLayer && loadedSvg) {
        svgElement.value = loadedSvg;
      }
    }

    // Initialize zoom after all floors are loaded
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

  /**
   * Update opacity of existing floor SVGs without re-fetching.
   * Applies effectiveFloorOpacity for BELOW/SELECTED/ABOVE and disables pointer events
   * for non-selected layers, keeping only the active floor interactive.
   */
  const updateFloorOpacity = (wrapper: HTMLElement, selectedFloorIndex: number) => {
    const svgs = wrapper.querySelectorAll<SVGSVGElement>('svg[data-floor-layer="true"]');

    svgs.forEach((svg, index) => {
      // Floors below are dimmed, selected floor is fully opaque, floors above are barely visible.
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

      // Only the selected floor layer should be interactive; others ignore pointer events.
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

  /**
   * Draw a single floor layer with specified opacity
   */
  const drawFloorLayer = async (
    wrapper: HTMLElement,
    fileName: string,
    opacity: number,
    _isMainLayer: boolean = false,
    isFirstLayer: boolean = false
  ): Promise<SVGSVGElement | null> => {
    // Check cache first
    if (svgCache.value.has(fileName)) {
      const cachedSvg = svgCache.value.get(fileName)!;

      // Update opacity; pointer-events/main-layer flags are managed by updateFloorOpacity.
      cachedSvg.style.opacity = opacity.toString();
      cachedSvg.removeAttribute('data-main-layer');
      cachedSvg.style.pointerEvents = 'none'; // Let markers handle clicks, not the SVG layer itself

      // If not already in DOM, append it
      if (!wrapper.contains(cachedSvg)) {
        wrapper.appendChild(cachedSvg);
      }

      return cachedSvg;
    }

    // Not in cache - fetch it (with memoized SVG URL)
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

      // Set proper scaling attributes
      rootElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      rootElement.setAttribute('data-floor-file', fileName); // Add identifier
      rootElement.setAttribute('data-floor-layer', 'true'); // Mark as floor layer for detection
      rootElement.style.width = '100%';
      rootElement.style.height = 'auto';
      rootElement.style.display = 'block';

      // First layer is relative (defines height), others are absolute (overlay)
      if (isFirstLayer) {
        rootElement.style.position = 'relative';
      } else {
        rootElement.style.position = 'absolute';
        rootElement.style.top = '0';
        rootElement.style.left = '0';
      }

      rootElement.style.opacity = opacity.toString();
      // Floor SVG layers are non-interactive by default. updateFloorOpacity will enable pointer events
      // only on the currently selected floor so legitimate SVG interactions remain possible on that layer,
      // while markers stay clickable via the markers-overlay above.
      rootElement.style.pointerEvents = 'none';
      rootElement.removeAttribute('data-main-layer');
      rootElement.style.zIndex = '0'; // Keep SVGs below markers

      // Cache the SVG element
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
    // Lab uses old tarkovdata CDN (uses PNG tiles on tarkov.dev)
    // All others use tarkov.dev CDN
    // Use cached SVG URL to avoid recomputing
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

      // Set proper scaling attributes
      svgElement.value.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svgElement.value.style.width = '100%';
      svgElement.value.style.height = 'auto';
      svgElement.value.style.display = 'block';

      // Find the wrapper that contains both markers and SVG
      const wrapper = mapContainer.querySelector('.map-content-wrapper') as HTMLElement;
      if (wrapper) {
        wrapper.appendChild(svgElement.value);
      } else {
        mapContainer.appendChild(svgElement.value);
      }

      // Initialize zoom behavior
      if (mapContainer.parentElement) {
        initializeZoom({
          wrapper: wrapper || mapContainer,
          viewport: mapContainer.parentElement,
          mapContainerId: randomMapId.value,
        });
      }

      // Apply floor visibility logic for standard maps
      const floors = svgFloors.value;
      if (selectedFloor.value && floors && floors.length > 0 && svgElement.value) {
        const selectedFloorIndex = floors.indexOf(selectedFloor.value);
        if (selectedFloorIndex !== -1) {
          const svg = svgElement.value; // Capture for closure
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
    // Clear SVG cache when component unmounts
    svgCache.value.clear();
  });
</script>

<style lang="scss" scoped>
  .map-viewport {
    position: relative;
    width: 100%;
    background: #1a1a1a;
    border-radius: 4px;
    overflow: hidden;
    cursor: grab;
  }

  .map-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 320px;
    background: #1f1f1f;
    border-radius: 4px;
    padding: 24px;
    text-align: center;
  }

  .map-placeholder-alert {
    --v-border-opacity: 1;
    background-color: rgba(255, 214, 0, 0.16);
    border-color: rgba(255, 214, 0, 0.8) !important;
    font-weight: 600;
  }

  .map-placeholder-alert :deep(.v-alert__prepend .v-icon) {
    color: #ffea00;
  }

  .map-placeholder-alert :deep(.v-alert__content) {
    color: #fff59d;
  }

  .map-viewport:active {
    cursor: grabbing;
  }

  .map-container {
    position: relative;
    width: 100%;
    line-height: 0;
  }

  .map-content-wrapper {
    position: relative;
    width: 100%;
    transform-origin: 0 0;
  }

  .markers-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10; /* Above SVG layers */
    pointer-events: none; /* Overlay itself is transparent to events; children opt-in via auto */
    line-height: normal;
  }

  .markers-overlay > * {
    pointer-events: auto; /* Markers and zones are clickable */
  }

  .floor-controls {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    max-width: 140px;
  }

  .floor-button {
    font-size: 11px;
    text-transform: capitalize;
    min-width: 100px !important;
  }

  .zoom-controls {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .zoom-indicator {
    position: absolute;
    bottom: 16px;
    right: 16px;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  }

  .scroll-hint {
    position: absolute;
    bottom: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1001;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.3s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }

  :deep(svg) {
    cursor: grab;
  }

  :deep(svg:active) {
    cursor: grabbing;
  }
</style>
