export const DEFAULT_LANGUAGE = 'en';
/**
 * Virtual list rendering configuration
 * Performance optimization: Reduced from 24 → 12 → 8 to improve initial render time
 * TaskCard components are heavy (415 lines, 15+ computed properties each)
 * 8 cards × 15 computed properties = 120 evaluations vs 180 at 12 cards (33% reduction)
 *
 * Trade-off: Fewer initial cards improve perceived loading speed, but users may prefer to see
 * more content immediately, even if rendering is marginally slower. Consider user experience
 * when adjusting INITIAL_BATCH. If users report too much scrolling to reach content, consider
 * increasing the value despite the performance cost.
 */
export const VIRTUAL_LIST_INITIAL_BATCH = 8;
export const VIRTUAL_LIST_BATCH_INCREMENT = 16;
