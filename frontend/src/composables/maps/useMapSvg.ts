import { ref, computed, watch, type Ref } from 'vue';
import type { TarkovMap } from '@/types/models/tarkov';
import type { MapSvgDefinition } from '@/types/models/maps';
import { getMapSvgUrl } from '@/utils/mapUtils';
import { logger } from '@/utils/logger';

interface UseMapSvgOptions {
  map: Ref<TarkovMap | undefined>;
  onSvgLoad?: (svg: SVGSVGElement) => void;
  onSvgError?: (error: string) => void;
}

export function useMapSvg(options: UseMapSvgOptions) {
  const svgElement = ref<SVGSVGElement | null>(null);
  const svgCache = ref(new Map<string, SVGSVGElement>());
  const svgUrlCache = ref(new Map<string, string>());
  const loadError = ref<string | null>(null);

  const mapSvg = computed<MapSvgDefinition | undefined>(() => {
    const svg = options.map.value?.svg;
    if (svg && typeof svg === 'object') {
      return svg as MapSvgDefinition;
    }
    return undefined;
  });

  const mapHasSvg = computed(() => {
    const svg = options.map.value?.svg;
    if (!svg) return false;
    if (typeof svg === 'string') {
      return svg.trim().length > 0;
    }
    return Boolean(svg.file);
  });

  const mapUnavailableMessage = computed(() => {
    if (mapHasSvg.value) return '';
    return (
      options.map.value?.unavailableMessage ?? 'Map data is not available for this location yet.'
    );
  });

  const svgFloors = computed(() => mapSvg.value?.floors ?? []);

  const initialFloor = computed(() => {
    if (!mapSvg.value) return undefined;
    return mapSvg.value.defaultFloor ?? svgFloors.value[svgFloors.value.length - 1];
  });

  const selectedFloor = ref<string | undefined>(initialFloor.value);

  // Update selectedFloor when initialFloor changes
  watch(
    initialFloor,
    (newFloor) => {
      if (newFloor && !selectedFloor.value) {
        selectedFloor.value = newFloor;
      }
    },
    { immediate: true }
  );

  const svgFileName = computed(() => {
    const svg = options.map.value?.svg;
    if (typeof svg === 'string') {
      return svg;
    }
    const baseFile = svg?.file;
    if (!baseFile) return undefined;

    // If there are multiple floors and a floor is selected, replace the floor in the filename
    if (svgFloors.value.length > 1 && selectedFloor.value) {
      const match = baseFile.match(/^(.+?)(-[\w_]+)?\.svg$/);
      if (match) {
        const baseName = match[1];
        return `${baseName}-${selectedFloor.value}.svg`;
      }
    }

    // Otherwise use the base file as is
    return baseFile;
  });

  const svgUrl = computed(() => {
    const fileName = svgFileName.value;
    if (!fileName || !mapHasSvg.value) return undefined;
    const mapName = options.map.value?.name;
    return getMapSvgUrl(fileName, mapName);
  });

  // Load SVG when URL changes
  watch(
    svgUrl,
    async (newUrl) => {
      if (!newUrl) {
        svgElement.value = null;
        return;
      }

      // Check cache first
      if (svgCache.value.has(newUrl)) {
        svgElement.value = svgCache.value.get(newUrl)!;
        options.onSvgLoad?.(svgElement.value);
        return;
      }

      try {
        loadError.value = null;
        const response = await fetch(newUrl);
        if (!response.ok) {
          throw new Error(`Failed to load map SVG: ${response.statusText}`);
        }

        const svgText = await response.text();
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const svg = svgDoc.querySelector('svg') as SVGSVGElement;

        if (!svg) {
          throw new Error('Invalid SVG: No SVG element found');
        }

        svgElement.value = svg;
        svgCache.value.set(newUrl, svg);
        options.onSvgLoad?.(svg);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error loading map';
        loadError.value = errorMessage;
        logger.error('Failed to load map SVG:', error);
        options.onSvgError?.(errorMessage);
      }
    },
    { immediate: true }
  );

  function clearCache() {
    svgCache.value.clear();
    svgUrlCache.value.clear();
  }

  function setFloor(floor: string) {
    selectedFloor.value = floor;
  }

  return {
    svgElement,
    loadError,
    mapHasSvg,
    mapUnavailableMessage,
    svgFloors,
    selectedFloor,
    setFloor,
    clearCache,
  };
}
