<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <template v-if="props.map?.svg?.floors?.length > 0">
          <template v-for="(floor, floorIndex) in props.map.svg.floors" :key="floorIndex">
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
        <div :id="randomMapId" style="position: relative; width: 100%">
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

  interface Props {
    map: Record<string, any>;
    marks?: Record<string, any>[];
  }

  const randomMapId = ref(uuidv4());
  const props = withDefaults(defineProps<Props>(), {
    marks: () => [],
  });
  const MapMarker = defineAsyncComponent(() => import('@/features/maps/MapMarker.vue'));
  const MapZone = defineAsyncComponent(() => import('@/features/maps/MapZone.vue'));
  const selectedFloor = ref<
    string | undefined // Changed from string | null
  >(
    props.map?.svg?.defaultFloor ??
      props.map?.svg?.floors?.[props.map.svg.floors.length - 1] ??
      undefined
  );

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
    let zones: any[] = [];

    for (const mark of props.marks) {
      for (const zone of mark.zones) {
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
  watch(
    () => props.map,
    (newMap) => {
      // Reset cache when map changes
      factoryFloorsCache.value.clear();
      isFactoryLoaded.value = false;

      draw();
      // Safely update selectedFloor only if floors exist, prioritize defaultFloor
      const floors = newMap?.svg?.floors;
      selectedFloor.value = newMap?.svg?.defaultFloor ?? floors?.[floors.length - 1] ?? undefined;
    }
  );
  const draw = async () => {
    // Add check for map svg data before proceeding
    if (!props.map?.svg?.file) {
      console.warn('Map SVG file info missing, skipping draw.');
      // Clear existing SVG if any
      d3.select(document.getElementById(randomMapId.value)).selectAll('svg').remove();
      return;
    }

    const mapContainer = document.getElementById(randomMapId.value);
    if (!mapContainer) return;

    // Clear existing content
    d3.select(mapContainer).selectAll('svg').remove();

    // Check if this is Factory - handle multi-file floor stacking
    if (props.map.name?.toLowerCase() === 'factory') {
      await drawFactoryFloors(mapContainer);
    } else {
      // Handle other maps with single SVG file containing all floors
      await drawStandardMap(mapContainer);
    }
  };

  const drawFactoryFloors = async (mapContainer: HTMLElement) => {
    const floors = props.map?.svg?.floors;
    if (!floors || !selectedFloor.value) {
      return;
    }

    // Create a single main SVG container (like other maps do)
    const mainSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mainSvg.style.width = '100%';
    mainSvg.style.height = '100%';
    mainSvg.id = 'factory-main-svg';

    // Load all floors if not cached, or use cached versions
    let viewBoxSet = false;

    for (let i = 0; i < floors.length; i++) {
      const floor = floors[i];
      try {
        let floorSvg;

        // Check cache first
        if (factoryFloorsCache.value.has(floor)) {
          floorSvg = factoryFloorsCache.value.get(floor);
        } else {
          // Load and cache the floor
          floorSvg = await d3.svg(`/img/maps/Factory-${floor}.svg`);
          factoryFloorsCache.value.set(floor, floorSvg);
        }

        if (floorSvg && floorSvg.documentElement) {
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
          const svgChildren = Array.from(floorSvg.documentElement.children);
          svgChildren.forEach((child) => {
            floorGroup.appendChild(child.cloneNode(true));
          });

          // Append the group to our main SVG
          mainSvg.appendChild(floorGroup);
        }
      } catch (error) {
        console.error(`Failed to load Factory floor: ${floor}`, error);
      }
    }

    // Append the main SVG to the container
    mapContainer.appendChild(mainSvg);
    isFactoryLoaded.value = true;

    // Apply initial floor visibility
    updateFactoryFloorVisibility();
  };

  const updateFactoryFloorVisibility = () => {
    const floors = props.map?.svg?.floors;
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

  const drawStandardMap = async (mapContainer: HTMLElement) => {
    // Use remote SVG files for other maps
    const svgUrl = `https://tarkovtracker.github.io/tarkovdata/maps/${props.map.svg.file}`;

    const svg = await d3.svg(svgUrl);
    mapContainer.appendChild(svg.documentElement);
    d3.select(mapContainer).select('svg').style('width', '100%');
    d3.select(mapContainer).select('svg').style('height', '100%');

    // Apply floor visibility logic for standard maps
    const floors = props.map?.svg?.floors;
    if (selectedFloor.value && floors && floors.length > 0) {
      const selectedFloorIndex = floors.indexOf(selectedFloor.value);
      if (selectedFloorIndex !== -1) {
        floors.forEach((floor: string, index: number) => {
          if (index > selectedFloorIndex) {
            d3.select(mapContainer).select('svg').select(`#${floor}`).style('opacity', 0.02);
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
