<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <template v-if="svgFloors.length > 0">
          <template v-for="(floor, floorIndex) in svgFloors" :key="floorIndex">
            <v-btn
              variant="tonal"
              :color="floor == selectedFloor ? 'green' : ''"
              class="mx-2"
              @click="setFloor(floor)"
              >{{ floor.replace('_', ' ') }}</v-btn
            >
          </template>
        </template>
      </v-col>
      <v-col cols="12">
        <div :id="randomMapId" style="position: relative; width: 100%; line-height: 0">
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
      </v-col>
    </v-row>
  </v-container>
</template>
<script setup lang="ts">
  import { ref, onMounted, watch, defineAsyncComponent, withDefaults, computed } from 'vue';
  import { v4 as uuidv4 } from 'uuid';
  import * as d3 from 'd3';
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

  const mapSvg = computed<MapSvgDefinition | undefined>(() => {
    const svg = props.map?.svg;
    if (svg && typeof svg === 'object') {
      return svg as MapSvgDefinition;
    }
    return undefined;
  });

  const svgFloors = computed(() => mapSvg.value?.floors ?? []);
  const svgFileName = computed(() => {
    const svg = props.map?.svg;
    if (typeof svg === 'string') {
      return svg;
    }
    return svg?.file;
  });
  const initialFloor = computed(() => {
    if (!mapSvg.value) return undefined;
    return mapSvg.value.defaultFloor ?? svgFloors.value[svgFloors.value.length - 1];
  });
  const selectedFloor = ref<
    string | undefined // Changed from string | null
  >(initialFloor.value);

  // Cache for Factory floors to avoid refetching
  const factoryFloorsCache = ref<Map<string, Document>>(new Map());
  const isFactoryLoaded = ref(false);

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

    // For Factory, just toggle visibility instead of full redraw
    if (props.map.name?.toLowerCase() === 'factory' && isFactoryLoaded.value) {
      updateFactoryFloorVisibility();
    } else {
      draw();
    }
  };
  watch(initialFloor, (floor) => {
    selectedFloor.value = floor;
  });

  watch(
    selectedFloor,
    () => {
      if (props.map.name?.toLowerCase() === 'factory' && isFactoryLoaded.value) {
        updateFactoryFloorVisibility();
      }
    }
  );

  watch(
    () => props.map,
    () => {
      factoryFloorsCache.value.clear();
      isFactoryLoaded.value = false;
      draw();
    }
  );
  const draw = async () => {
    // Add check for map svg data before proceeding
    const fileName = svgFileName.value;
    if (!fileName) {
      logger.warn('Map SVG file info missing, skipping draw.');
      // Clear existing SVG if any
      const container = document.getElementById(randomMapId.value);
      if (container) {
        container.querySelectorAll('svg').forEach((node) => node.remove());
      }
      return;
    }

    const mapContainer = document.getElementById(randomMapId.value);
    if (!mapContainer) return;

    // Clear existing content
    mapContainer.querySelectorAll('svg').forEach((node) => node.remove());

    // Check if this is Factory - handle multi-file floor stacking
    if (props.map.name?.toLowerCase() === 'factory' && svgFloors.value.length > 0) {
      await drawFactoryFloors(mapContainer);
    } else {
      // Handle other maps with single SVG file containing all floors
      await drawStandardMap(mapContainer, fileName);
    }
  };

  const drawFactoryFloors = async (mapContainer: HTMLElement) => {
    const floors = svgFloors.value;
    if (!floors || !selectedFloor.value) {
      return;
    }

    // Create a single main SVG container (like other maps do)
    const mainSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mainSvg.style.width = '100%';
    mainSvg.style.height = 'auto'; // Changed from 100% to auto to maintain aspect ratio
    mainSvg.style.display = 'block';
    mainSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet'); // Ensure proper scaling
    mainSvg.id = 'factory-main-svg';

    // Load all floors if not cached, or use cached versions
    let viewBoxSet = false;

    for (let i = 0; i < floors.length; i++) {
      const floor = floors[i];
      try {
        let floorSvg: Document | null = null;

        // Check cache first
        if (factoryFloorsCache.value.has(floor)) {
          floorSvg = factoryFloorsCache.value.get(floor) ?? null;
        } else {
          // Load and cache the floor
          floorSvg = await d3.svg(`/img/maps/Factory-${floor}.svg`);
          if (floorSvg) {
            factoryFloorsCache.value.set(floor, floorSvg);
          }
        }

        if (floorSvg?.documentElement) {
          // Set the viewBox from the first floor SVG to ensure proper scaling
          if (!viewBoxSet && floorSvg.documentElement.getAttribute('viewBox')) {
            const viewBox = floorSvg.documentElement.getAttribute('viewBox');
            if (viewBox) {
              mainSvg.setAttribute('viewBox', viewBox);
            }
            viewBoxSet = true;
          }

          // Create a group for this floor
          const floorGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          floorGroup.id = floor;

          // Copy all children from the loaded SVG to our group
          const svgChildren = Array.from(
            floorSvg.documentElement.children
          ) as Element[];
          svgChildren.forEach((child: Element) => {
            floorGroup.appendChild(child.cloneNode(true));
          });

          // Append the group to our main SVG
          mainSvg.appendChild(floorGroup);
        }
      } catch (error) {
        logger.error(`Failed to load Factory floor: ${floor}`, error);
      }
    }

    // Append the main SVG to the container
    mapContainer.appendChild(mainSvg);
    isFactoryLoaded.value = true;

    // Apply initial floor visibility
    updateFactoryFloorVisibility();
  };

  const updateFactoryFloorVisibility = () => {
    const floors = svgFloors.value;
    if (!floors || !selectedFloor.value) return;

    const selectedFloorIndex = floors.indexOf(selectedFloor.value);
    if (selectedFloorIndex === -1) return;

    const mapContainer = document.getElementById(randomMapId.value);
    if (!mapContainer) return;

    const svg = mapContainer.querySelector('#factory-main-svg');
    if (!svg) return;

    // Show floors from basement up to selected floor, hide floors above
    floors.forEach((floor: string, index: number) => {
      const floorGroup = svg.querySelector(`#${floor}`);
      if (floorGroup && floorGroup instanceof SVGGElement) {
        if (index <= selectedFloorIndex) {
          floorGroup.style.display = 'block';
          floorGroup.style.opacity = '1';
        } else {
          floorGroup.style.display = 'none';
        }
      }
    });
  };

  const drawStandardMap = async (mapContainer: HTMLElement, fileName: string) => {
    // Use remote SVG files for other maps
    const svgUrl = `https://tarkovtracker.github.io/tarkovdata/maps/${fileName}`;

    const svg = await d3.svg(svgUrl);
    const rootElement = svg.documentElement;
    if (!(rootElement instanceof SVGSVGElement)) {
      logger.warn('Unexpected SVG root element', rootElement);
      return;
    }
    const svgElement = rootElement;

    // Set proper scaling attributes
    svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    mapContainer.appendChild(svgElement);
    svgElement.style.width = '100%';
    svgElement.style.height = 'auto';
    svgElement.style.display = 'block';

    // Apply floor visibility logic for standard maps
    const floors = svgFloors.value;
    if (selectedFloor.value && floors && floors.length > 0) {
      const selectedFloorIndex = floors.indexOf(selectedFloor.value);
      if (selectedFloorIndex !== -1) {
        floors.forEach((floor: string, index: number) => {
          if (index > selectedFloorIndex) {
            const floorElement = svgElement.querySelector<SVGGraphicsElement>(`#${floor}`);
            if (floorElement) {
              floorElement.style.opacity = '0.02';
            }
          }
        });
      }
    }
  };
  onMounted(() => {
    draw();
  });
</script>
<style lang="scss" scoped></style>
