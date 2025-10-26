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
              {{
                floor
                  .replace('_', ' ')
                  .replace(/Floor|Level/g, '')
                  .trim() || floor
              }}
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type D3Selection = any;
  import type { TarkovMap } from '@/types/tarkov';
  import type {
    MapSvgDefinition,
    ObjectiveMarker,
    MapZone as MapZoneDefinition,
  } from '@/types/maps';
  import { logger } from '@/utils/logger';

  interface Props {
    map: TarkovMap;
    marks?: ObjectiveMarker[];
  }

  const randomMapId = ref(uuidv4());
  const props = withDefaults(defineProps<Props>(), {
    marks: () => [] as ObjectiveMarker[],
  });
  const MapMarker = defineAsyncComponent(() => import('@/features/maps/MapMarker.vue'));
  const MapZone = defineAsyncComponent(() => import('@/features/maps/MapZone.vue'));

  // Zoom state
  const currentZoom = ref(1);
  const minZoom = 1; // 100% - no zoom out (prevent empty space around map)
  const maxZoom = 5; // 500% - max zoom in
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let zoomBehavior: any = null;
  let svgElement: SVGSVGElement | null = null;

  // Cache for loaded SVG elements (to avoid re-fetching)
  const svgCache = new Map<string, SVGSVGElement>();

  // Scroll hint state
  const showScrollHint = ref(false);
  let scrollHintTimeout: ReturnType<typeof setTimeout> | null = null;
  let wheelEventHandler: ((event: WheelEvent) => void) | null = null;
  let viewportElement: HTMLElement | null = null;

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
      // Get the base name without floor suffix
      // e.g., "Factory-Ground_Floor.svg" -> "Factory"
      const match = baseFile.match(/^(.+?)(-[\w_]+)?\.svg$/);
      if (match) {
        const baseName = match[1];
        // Construct filename for selected floor
        // e.g., "Factory" + "-" + "Second_Floor" + ".svg"
        return `${baseName}-${selectedFloor.value}.svg`;
      }
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
      draw();
    }
  };
  watch(initialFloor, (floor) => {
    selectedFloor.value = floor;
  });

  // Track current map to detect map changes (vs floor changes)
  let currentMapId: string | undefined = undefined;

  const teardownZoom = () => {
    const mapContainer = document.getElementById(randomMapId.value);
    if (zoomBehavior && mapContainer?.parentElement) {
      const viewport = d3.select(mapContainer.parentElement) as D3Selection;
      viewport.on('.zoom', null);
      viewport.on('mousedown.cursor', null);
      viewport.on('mouseup.cursor', null);
      viewport.on('dblclick', null);
    }

    if (viewportElement && wheelEventHandler) {
      viewportElement.removeEventListener('wheel', wheelEventHandler);
    }

    if (scrollHintTimeout) {
      clearTimeout(scrollHintTimeout);
    }

    showScrollHint.value = false;
    zoomBehavior = null;
    wheelEventHandler = null;
    viewportElement = null;
    scrollHintTimeout = null;
    svgElement = null;
    currentZoom.value = 1;
  };

  watch(
    () => props.map,
    (newMap) => {
      // Clear wrapper when switching to a different map
      if (newMap?.id !== currentMapId) {
        const mapContainer = document.getElementById(randomMapId.value);
        if (mapContainer) {
          const wrapper = mapContainer.querySelector('.map-content-wrapper') as HTMLElement;
          if (wrapper) {
            wrapper.querySelectorAll('svg').forEach((node) => node.remove());
          }
        }
        teardownZoom();
        currentMapId = newMap?.id;
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

      const baseFile = svg.file;
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
      const existingSvgs = wrapper.querySelectorAll('svg');
      const allFloorsLoaded = existingSvgs.length === floors.length;

      if (allFloorsLoaded) {
        // Just update opacity without re-fetching
        updateFloorOpacity(wrapper, selectedFloorIndex);
      } else {
        // Initial load - fetch and add all floors
        for (let i = 0; i < floors.length; i++) {
          const floor = floors[i];
          const floorFileName = `${baseName}-${floor}.svg`;

          // Calculate opacity based on position relative to selected floor
          let opacity = 1.0;
          const isMainLayer = i === selectedFloorIndex;
          const isFirstLayer = i === 0; // First layer defines wrapper height

          if (i < selectedFloorIndex) {
            opacity = 0.4;
          } else if (isMainLayer) {
            opacity = 1.0;
          } else {
            opacity = 0.05;
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
            svgElement = loadedSvg;
          }
        }

        // Initialize zoom after all floors are loaded
        if (svgElement) {
          initializeZoom();
        }
      }
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
   * Update opacity of existing floor SVGs without re-fetching
   */
  const updateFloorOpacity = (wrapper: HTMLElement, selectedFloorIndex: number) => {
    const svgs = wrapper.querySelectorAll('svg');

    svgs.forEach((svg, index) => {
      let opacity = 1.0;
      const isMainLayer = index === selectedFloorIndex;

      if (index < selectedFloorIndex) {
        opacity = 0.4; // Floors below
      } else if (isMainLayer) {
        opacity = 1.0; // Selected floor
      } else {
        opacity = 0.05; // Floors above
      }

      const currentSvg = svg as SVGSVGElement;
      currentSvg.style.opacity = opacity.toString();
      currentSvg.style.pointerEvents = isMainLayer ? 'auto' : 'none';

      // Update svgElement reference for main layer
      if (isMainLayer) {
        svgElement = currentSvg;
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
    isMainLayer: boolean = false,
    isFirstLayer: boolean = false
  ): Promise<SVGSVGElement | null> => {
    // Check cache first
    if (svgCache.has(fileName)) {
      const cachedSvg = svgCache.get(fileName)!;

      // Update opacity and pointer events
      cachedSvg.style.opacity = opacity.toString();
      cachedSvg.style.pointerEvents = isMainLayer ? 'auto' : 'none';

      // If not already in DOM, append it
      if (!wrapper.contains(cachedSvg)) {
        wrapper.appendChild(cachedSvg);
      }

      return cachedSvg;
    }

    // Not in cache - fetch it
    const isLab = props.map.name?.toLowerCase() === 'the lab';

    const svgUrl = isLab
      ? `https://raw.githubusercontent.com/TarkovTracker/tarkovdata/master/maps/${fileName}`
      : `https://assets.tarkov.dev/maps/svg/${fileName}`;

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
      // All SVG layers should not intercept pointer events - let markers handle clicks
      rootElement.style.pointerEvents = 'none';
      rootElement.style.zIndex = '0'; // Keep SVGs below markers

      // Cache the SVG element
      svgCache.set(fileName, rootElement);

      wrapper.appendChild(rootElement);

      return rootElement;
    } catch (err) {
      logger.error(`Failed to load floor: ${fileName}`, err);
      return null;
    }
  };

  const drawStandardMap = async (mapContainer: HTMLElement, fileName: string) => {
    // Lab uses old tarkovdata CDN (uses PNG tiles on tarkov.dev)
    // All others use tarkov.dev CDN
    const isLab = props.map.name?.toLowerCase() === 'the lab';

    const svgUrl = isLab
      ? `https://raw.githubusercontent.com/TarkovTracker/tarkovdata/master/maps/${fileName}`
      : `https://assets.tarkov.dev/maps/svg/${fileName}`;

    try {
      const svg = await d3.svg(svgUrl);
      const rootElement = svg.documentElement;
      if (!(rootElement instanceof SVGSVGElement)) {
        logger.warn('Unexpected SVG root element', rootElement);
        return;
      }
      svgElement = rootElement;

      // Set proper scaling attributes
      svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svgElement.style.width = '100%';
      svgElement.style.height = 'auto';
      svgElement.style.display = 'block';

      // Find the wrapper that contains both markers and SVG
      const wrapper = mapContainer.querySelector('.map-content-wrapper') as HTMLElement;
      if (wrapper) {
        wrapper.appendChild(svgElement);
      } else {
        mapContainer.appendChild(svgElement);
      }

      // Initialize zoom behavior
      initializeZoom();

      // Apply floor visibility logic for standard maps
      const floors = svgFloors.value;
      if (selectedFloor.value && floors && floors.length > 0 && svgElement) {
        const selectedFloorIndex = floors.indexOf(selectedFloor.value);
        if (selectedFloorIndex !== -1) {
          const svg = svgElement; // Capture for closure
          floors.forEach((floor: string, index: number) => {
            if (index > selectedFloorIndex) {
              const floorElement = svg.querySelector<SVGGraphicsElement>(`#${floor}`);
              if (floorElement) {
                floorElement.style.opacity = '0.02';
              }
            }
          });
        }
      }
    } catch (err) {
      logger.error(`Failed to load map: ${fileName}`, err);
    }
  };

  /**
   * Initialize D3 zoom behavior
   */
  function initializeZoom() {
    if (!svgElement) return;

    // Get the wrapper that contains both SVG and markers
    const mapContainer = document.getElementById(randomMapId.value);
    if (!mapContainer) return;

    const wrapper = mapContainer.querySelector('.map-content-wrapper') as HTMLElement;
    if (!wrapper) return;

    const wrapperSelection = d3.select(wrapper) as D3Selection;
    const viewport = d3.select(mapContainer.parentElement) as D3Selection;

    // Get viewport and content dimensions for pan constraints
    const viewportWidth = mapContainer.parentElement?.clientWidth || 800;
    const viewportHeight = mapContainer.parentElement?.clientHeight || 600;
    const contentWidth = wrapper.clientWidth || viewportWidth;
    const contentHeight = wrapper.clientHeight || viewportHeight;

    // Create zoom behavior
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    zoomBehavior = (d3 as any)
      .zoom()
      .scaleExtent([minZoom, maxZoom])
      // Set extent to viewport size (what user can see)
      .extent([
        [0, 0],
        [viewportWidth, viewportHeight],
      ])
      // Constrain panning - tight bounds to keep map always visible
      // Allow minimal overflow (10%) to reach edges comfortably
      .translateExtent([
        [-contentWidth * 0.1, -contentHeight * 0.1], // Allow 10% overflow on top-left
        [contentWidth * 1.1, contentHeight * 1.1], // Allow 10% overflow on bottom-right
      ])
      // Filter wheel events - only zoom with Alt key (prevent accidental zoom while scrolling page)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((event: any) => {
        // Allow all non-wheel events (drag pan, programmatic zoom, etc.)
        if (event.type !== 'wheel') return true;

        // For wheel events, require Alt key (doesn't conflict with browser zoom)
        return event.altKey;
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('zoom', (event: any) => {
        // Apply transform to the wrapper (which contains both SVG and markers)
        wrapperSelection.style(
          'transform',
          `translate(${event.transform.x}px, ${event.transform.y}px) scale(${event.transform.k})`
        );
        wrapperSelection.style('transform-origin', '0 0');
        currentZoom.value = event.transform.k;
      });

    // Apply zoom behavior to the viewport
    viewport.call(zoomBehavior);

    // Show hint when user tries to scroll without Alt
    // Use native addEventListener with passive option to avoid blocking scroll
    viewportElement = mapContainer.parentElement;
    if (viewportElement) {
      wheelEventHandler = (event: WheelEvent) => {
        if (!event.altKey) {
          // User scrolled without Alt key - show hint
          showScrollHint.value = true;

          // Clear existing timeout
          if (scrollHintTimeout) {
            clearTimeout(scrollHintTimeout);
          }

          // Hide hint after 2 seconds
          scrollHintTimeout = setTimeout(() => {
            showScrollHint.value = false;
          }, 2000);
        }
      };

      viewportElement.addEventListener('wheel', wheelEventHandler, { passive: true });
    }

    // Change cursor on drag
    viewport.style('cursor', 'grab');
    viewport.on('mousedown.cursor', () => {
      viewport.style('cursor', 'grabbing');
    });
    viewport.on('mouseup.cursor', () => {
      viewport.style('cursor', 'grab');
    });

    // Double-click to zoom in
    viewport.on('dblclick.zoom', null);
    viewport.on('dblclick', () => {
      if (!zoomBehavior) return;
      viewport.transition().duration(300).call(zoomBehavior.scaleBy, 1.5);
    });
  }

  /**
   * Zoom controls
   */
  function zoomIn() {
    if (!zoomBehavior) return;
    const mapContainer = document.getElementById(randomMapId.value);
    if (!mapContainer) return;
    const viewport = d3.select(mapContainer.parentElement) as D3Selection;
    viewport.transition().duration(300).call(zoomBehavior.scaleBy, 1.3);
  }

  function zoomOut() {
    if (!zoomBehavior) return;
    const mapContainer = document.getElementById(randomMapId.value);
    if (!mapContainer) return;
    const viewport = d3.select(mapContainer.parentElement) as D3Selection;
    viewport.transition().duration(300).call(zoomBehavior.scaleBy, 0.7);
  }

  function resetZoom() {
    if (!zoomBehavior) return;
    const mapContainer = document.getElementById(randomMapId.value);
    if (!mapContainer) return;
    const viewport = d3.select(mapContainer.parentElement) as D3Selection;
    viewport.transition().duration(500).call(zoomBehavior.transform, d3.zoomIdentity);
  }

  onMounted(() => {
    currentMapId = props.map?.id;
    if (mapHasSvg.value) {
      draw();
    }
  });

  onBeforeUnmount(() => {
    teardownZoom();
    // Clear SVG cache when component unmounts
    svgCache.clear();
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
    pointer-events: none; /* Don't block SVG, but children can have pointer-events: auto */
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
