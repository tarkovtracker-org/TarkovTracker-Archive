import { ref, type Ref } from 'vue';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior, type D3ZoomEvent } from 'd3-zoom';
import 'd3-transition';
import type { Selection } from 'd3-selection';
export interface UseMapZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  onZoomChange?: (scale: number) => void;
}
export interface UseMapZoomReturn {
  currentZoom: Ref<number>;
  showScrollHint: Ref<boolean>;
  minZoom: Ref<number>;
  maxZoom: Ref<number>;
  initializeZoom: (params: {
    wrapper: HTMLElement;
    viewport: HTMLElement;
    mapContainerId: string;
  }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  teardownZoom: () => void;
}
type HTMLSelection = Selection<HTMLElement, unknown, null, undefined>;
export function useMapZoom(options: UseMapZoomOptions = {}): UseMapZoomReturn {
  const minZoomValue = options.minZoom ?? 1;
  const maxZoomValue = options.maxZoom ?? 5;
  const minZoom = ref(minZoomValue);
  const maxZoom = ref(maxZoomValue);
  const currentZoom = ref(1);
  const showScrollHint = ref(false);
  let zoomBehavior: ZoomBehavior<HTMLElement, unknown> | null = null;
  let scrollHintTimeout: ReturnType<typeof setTimeout> | null = null;
  let wheelEventHandler: ((event: WheelEvent) => void) | null = null;
  let viewportElement: HTMLElement | null = null;
  let currentMapContainerId: string | null = null;
  const initializeZoom = (params: {
    wrapper: HTMLElement;
    viewport: HTMLElement;
    mapContainerId: string;
  }) => {
    const { wrapper, viewport, mapContainerId } = params;
    currentMapContainerId = mapContainerId;
    const wrapperSelection = select(wrapper);
    const viewportSelection = select(viewport);
    const viewportWidth = viewport.clientWidth || 800;
    const viewportHeight = viewport.clientHeight || 600;
    const contentWidth = wrapper.clientWidth || viewportWidth;
    const contentHeight = wrapper.clientHeight || viewportHeight;
    zoomBehavior = zoom<HTMLElement, unknown>()
      .scaleExtent([minZoomValue, maxZoomValue])
      .extent([
        [0, 0],
        [viewportWidth, viewportHeight],
      ])
      .translateExtent([
        [-contentWidth * 0.1, -contentHeight * 0.1],
        [contentWidth * 1.1, contentHeight * 1.1],
      ])
      .filter((event: Event) => {
        if (event.type !== 'wheel') return true;
        return (event as WheelEvent).altKey;
      })
      .on('zoom', (event: D3ZoomEvent<HTMLElement, unknown>) => {
        wrapperSelection.style(
          'transform',
          `translate(${event.transform.x}px, ${event.transform.y}px) scale(${event.transform.k})`
        );
        wrapperSelection.style('transform-origin', '0 0');
        currentZoom.value = event.transform.k;
        options.onZoomChange?.(event.transform.k);
      });
    viewportSelection.call(zoomBehavior);
    viewportElement = viewport;
    if (viewportElement) {
      wheelEventHandler = (event: WheelEvent) => {
        if (!event.altKey) {
          showScrollHint.value = true;
          if (scrollHintTimeout) {
            clearTimeout(scrollHintTimeout);
          }
          scrollHintTimeout = setTimeout(() => {
            showScrollHint.value = false;
          }, 2000);
        }
      };
      viewportElement.addEventListener('wheel', wheelEventHandler, { passive: true });
    }
    viewportSelection.style('cursor', 'grab');
    viewportSelection.on('mousedown.cursor', () => {
      viewportSelection.style('cursor', 'grabbing');
    });
    viewportSelection.on('mouseup.cursor', () => {
      viewportSelection.style('cursor', 'grab');
    });
    viewportSelection.on('dblclick.zoom', null);
    viewportSelection.on('dblclick', () => {
      if (!zoomBehavior) return;
      viewportSelection.transition().duration(300).call(zoomBehavior.scaleBy, 1.5);
    });
  };
  const getViewportSelection = (): HTMLSelection | null => {
    if (!zoomBehavior || !currentMapContainerId) return null;
    const mapContainer = document.getElementById(currentMapContainerId);
    if (!mapContainer?.parentElement) return null;
    return select(mapContainer.parentElement) as HTMLSelection;
  };
  const zoomIn = () => {
    const viewport = getViewportSelection();
    const vb = zoomBehavior;
    if (!viewport || !vb) return;
    viewport.transition().duration(300).call(vb.scaleBy, 1.3);
  };
  const zoomOut = () => {
    const viewport = getViewportSelection();
    const vb = zoomBehavior;
    if (!viewport || !vb) return;
    viewport.transition().duration(300).call(vb.scaleBy, 0.7);
  };
  const resetZoom = () => {
    const viewport = getViewportSelection();
    const vb = zoomBehavior;
    if (!viewport || !vb) return;
    viewport.transition().duration(500).call(vb.transform, zoomIdentity);
  };
  const teardownZoom = () => {
    if (!currentMapContainerId) return;
    const viewport = getViewportSelection();
    if (viewport) {
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
    currentZoom.value = 1;
    currentMapContainerId = null;
  };
  return {
    currentZoom,
    showScrollHint,
    minZoom,
    maxZoom,
    initializeZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    teardownZoom,
  };
}
