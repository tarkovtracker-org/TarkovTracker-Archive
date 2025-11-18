import { ref, type Ref } from 'vue';
import * as d3 from 'd3';
import { logger } from '@/utils/logger';
import { getMapSvgUrl } from '@/utils/mapUtils';

interface FloorOpacity {
  SELECTED: number;
  BELOW: number;
  ABOVE: number;
}

interface UseMapDrawingOptions {
  mapName: string;
  floors: string[];
  selectedFloor: Ref<string | undefined>;
  effectiveFloorOpacity: Ref<FloorOpacity>;
  randomMapId: string;
  onSvgLoad?: (svg: SVGSVGElement) => void;
}

export function useMapDrawing(options: UseMapDrawingOptions) {
  const svgElement = ref<SVGSVGElement | null>(null);
  const svgCache = ref(new Map<string, SVGSVGElement>());
  const svgUrlCache = ref(new Map<string, string>());
  const loadError = ref<string | null>(null);

  async function drawStandardMap(mapContainer: HTMLElement, fileName: string): Promise<void> {
    const cacheKey = `${options.mapName}|${fileName}`;
    let svgUrl = svgUrlCache.value.get(cacheKey);
    if (!svgUrl) {
      svgUrl = getMapSvgUrl(fileName, options.mapName);
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

      options.onSvgLoad?.(svgElement.value);
    } catch (err) {
      logger.error(`Failed to load map: ${fileName}`, err);
      loadError.value = `Failed to load map: ${fileName}. Please try refreshing the page.`;
    }
  }

  async function drawMultiFloorMap(
    wrapper: HTMLElement,
    floors: string[],
    baseFile: string
  ): Promise<void> {
    const match = baseFile.match(/^(.+?)(-[\w_]+)?\.svg$/);
    if (!match) {
      logger.warn('Could not parse base file name:', baseFile);
      return;
    }

    const baseName = match[1];
    const selectedFloorIndex = options.selectedFloor.value
      ? floors.indexOf(options.selectedFloor.value)
      : floors.length - 1;
    const existingSvgs = wrapper.querySelectorAll('svg[data-floor-layer]');
    const allFloorsLoaded = existingSvgs.length === floors.length;

    if (allFloorsLoaded) {
      updateFloorOpacity(wrapper, selectedFloorIndex);
    } else {
      await loadAllFloors(wrapper, floors, baseName, selectedFloorIndex);
      updateFloorOpacity(wrapper, selectedFloorIndex);
    }
  }

  async function loadAllFloors(
    wrapper: HTMLElement,
    floors: string[],
    baseName: string,
    selectedFloorIndex: number
  ): Promise<void> {
    for (let i = 0; i < floors.length; i++) {
      const floor = floors[i];
      const floorFileName = `${baseName}-${floor}.svg`;
      let opacity = options.effectiveFloorOpacity.value.SELECTED;
      const isMainLayer = i === selectedFloorIndex;
      const isFirstLayer = i === 0;

      if (i < selectedFloorIndex) {
        opacity = options.effectiveFloorOpacity.value.BELOW;
      } else if (isMainLayer) {
        opacity = options.effectiveFloorOpacity.value.SELECTED;
      } else {
        opacity = options.effectiveFloorOpacity.value.ABOVE;
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
  }

  function updateFloorOpacity(wrapper: HTMLElement, selectedFloorIndex: number) {
    const svgs = wrapper.querySelectorAll<SVGSVGElement>('svg[data-floor-layer="true"]');
    svgs.forEach((svg, index) => {
      let opacity = options.effectiveFloorOpacity.value.SELECTED;
      const isMainLayer = index === selectedFloorIndex;

      if (index < selectedFloorIndex) {
        opacity = options.effectiveFloorOpacity.value.BELOW;
      } else if (isMainLayer) {
        opacity = options.effectiveFloorOpacity.value.SELECTED;
      } else {
        opacity = options.effectiveFloorOpacity.value.ABOVE;
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
  }

  async function drawFloorLayer(
    wrapper: HTMLElement,
    fileName: string,
    opacity: number,
    _isMainLayer: boolean = false,
    isFirstLayer: boolean = false
  ): Promise<SVGSVGElement | null> {
    if (svgCache.value.has(fileName)) {
      const cachedSvg = svgCache.value.get(fileName)!;
      cachedSvg.style.opacity = opacity.toString();
      cachedSvg.removeAttribute('data-main-layer');

      if (!wrapper.contains(cachedSvg)) {
        wrapper.appendChild(cachedSvg);
      }
      return cachedSvg;
    }

    const cacheKey = `${options.mapName}|${fileName}`;
    let svgUrl = svgUrlCache.value.get(cacheKey);
    if (!svgUrl) {
      svgUrl = getMapSvgUrl(fileName, options.mapName);
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
      loadError.value = `Failed to load map floor: ${fileName}. Please try refreshing the page.`;
      return null;
    }
  }

  function clearCache() {
    svgCache.value.clear();
    svgUrlCache.value.clear();
  }

  return {
    svgElement,
    loadError,
    drawStandardMap,
    drawMultiFloorMap,
    updateFloorOpacity,
    clearCache,
  };
}
