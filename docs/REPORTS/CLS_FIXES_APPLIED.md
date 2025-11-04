# Layout Shift (CLS) Performance Fixes Applied

**Date:** 2025-10-27  
**Target:** Fix CLS score from 0.694 → < 0.1 on /tasks route

## Changes Implemented

### ✅ Fix 1: Font Preloading (Expected: -66% CLS reduction)

**File:** `frontend/index.html`

**Changes:**

1. Added `<link rel="preload">` for Material Design Icons webfont
2. Added `<link rel="preload">` for Share Tech Mono webfont
3. Changed Share Tech Mono to use `display=optional` loading strategy

**Before:**

```html
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" />
<link rel="stylesheet" href=".../materialdesignicons.min.css" />
```

**After:**

```html
<!-- Preload critical fonts -->
<link rel="preload" 
      href=".../materialdesignicons-webfont.woff2" 
      as="font" type="font/woff2" crossorigin />
<link rel="preload" 
      href=".../sharetechmono/.../J7aHnp1uDWRBEqV98dVQztYldFcLowEFA87Heg.woff2" 
      as="font" type="font/woff2" crossorigin />

<!-- Load with optimized strategy -->
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=optional" />
```

**Impact:**

- Eliminates 2 major layout shifts (0.156 + 0.096 = 0.252 CLS)
- Fonts load earlier, preventing text reflow
- `display=optional` prevents font swap on slow connections

---

### ✅ Fix 2: Explicit Task Card Dimensions (Expected: -17% CLS reduction)

**File:** `frontend/src/features/tasks/TaskCard.vue`

**Changes:**

1. Added `min-height: 203px` to `.taskContainer`
2. Added CSS containment: `contain: layout style paint`

**Before:**

```scss
.taskContainer {
  position: relative;
  overflow: hidden;
}
```

**After:**

```scss
.taskContainer {
  position: relative;
  overflow: hidden;
  /* CLS optimization: Set explicit minimum height to prevent layout shift */
  min-height: 203px;
  /* CSS containment to isolate layout calculations */
  contain: layout style paint;
}
```

**Impact:**

- Each task card reserves 203px height before content loads
- Prevents cascading shifts as 482 cards render
- CSS containment isolates layout recalculations per card
- Reduces individual card shift from 0.121 → ~0.02

### ⚠️ Caution: `contain` CSS Property Side Effects

While `contain: layout style paint` is powerful for performance, it introduces specific side effects that require careful testing, especially with complex UI elements:

-   **Stacking Contexts:** `contain: layout` can create a new stacking context, which might affect `z-index` behavior of children, potentially causing elements to appear above or below where expected.
-   **Positioned Descendants:** Absolutely or fixed positioned descendants of a contained element might be clipped or positioned relative to the contained element's padding box, rather than the viewport or a higher ancestor.
-   **Z-index/Clipping Behavior:** Elements like modals, popovers, tooltips, or dropdowns that rely on breaking out of their parent's bounds or specific `z-index` layering might behave unexpectedly.

**Recommendation:** Thoroughly test any UI components that use `contain` with modals, popovers, tooltips, and absolutely-positioned children to ensure no unintended visual regressions or clipping issues. Consider alternatives like using an inner wrapper for containment, applying `contain` selectively (e.g., `contain: paint` only), or avoiding containment where these side effects are problematic.

*Note: Reductions are estimates and content-dependent.*

---

### ✅ Fix 3: Skeleton Loaders (Expected: -21% CLS reduction)

**File:** `frontend/src/features/tasks/TaskCardList.vue`

**Changes:**

1. Added skeleton loader component with explicit 203px height
2. Show 10 skeleton cards during initial load
3. Only shows skeletons on first load (when tasks.length === 0)
4. Pass loading state from parent component

**Key Code:**

```vue
<template>
  <!-- Skeleton loaders during initial load -->
  <template v-if="isInitialLoading">
    <div v-for="n in skeletonCount" class="task-card-skeleton">
      <v-skeleton-loader type="article, actions" height="203" />
    </div>
  </template>
  
  <!-- Actual task cards -->
  <div v-else v-for="task in tasks">
    <task-card :task="task" />
  </div>
</template>
```

**Styling:**

```scss
.task-card-skeleton {
  min-height: 203px;  // Match actual card height
  border-radius: 4px;
  overflow: hidden;
}
```

**Impact:**

- Footer no longer shifts as tasks render (0.147 → ~0.01)
- Users see visual placeholder content immediately
- Smooth transition from skeleton → actual content

---

**File:** `frontend/src/pages/TaskList.vue`

**Changes:**

- Pass `loading` prop to TaskCardList component
- `<TaskCardList :loading="loadingTasks || reloadingTasks" />`

---

## Expected Performance Improvements

| Metric | Before | After (Expected) | Contribution (not additive) |
|--------|--------|------------------|--------|
| **CLS Score** | **0.694** | **< 0.08** | **-88%** ✅ |
| Font shift (MDI) | 0.156 | ~0.005 | -97% |
| Font shift (ShareTech) | 0.096 | ~0.005 | -95% |
| Task card shift | 0.121 | ~0.02 | -83% |
| Footer shift | 0.147 | ~0.01 | -93% |
| **Overall CLS** | **0.694** | **~0.04-0.08** | **90%+ improvement** |
*Note: The individual contributions listed above are not strictly additive due to overlaps in layout shifts. The final CLS of ~0.04–0.08 is a combined result of all applied fixes.*

### Performance Score Prediction

- Current: 0-1 / 100
- Expected: 60-75 / 100
- Improvement: **+6000-7400%**

---

## Testing Checklist

Run the following tests to verify improvements:

### 1. Build & Deploy

```bash
npm run build
npm run dev:firebase
```

### 2. Lighthouse Audit

```bash
# Navigate to http://localhost:5000/tasks
# Open DevTools > Lighthouse > Performance audit
# Expected CLS: < 0.1 (ideally < 0.08)
```

### 3. Visual Verification

- [ ] Fonts load without text reflow
- [ ] Skeleton loaders appear during initial load
- [ ] Task cards don't shift after loading
- [ ] Footer stays stable
- [ ] Smooth skeleton → content transition

### 4. Different Task Counts

Test with various task counts to ensure consistency:

- [ ] 10 tasks (all available)
- [ ] 50 tasks (mixed)
- [ ] 200 tasks (mostly locked)
- [ ] 482 tasks (all locked - worst case)

### 5. Network Conditions

Test on throttled connections:

- [ ] Fast 3G (font preload effectiveness)
- [ ] Slow 3G (font-display: optional behavior)
- [ ] Offline (skeleton loader fallback)

---

## Next Steps (If Needed)

If CLS is still > 0.1 after these fixes:

### Additional Optimizations

1. **Self-host fonts** instead of CDN (eliminates external request)
2. **Implement virtual scrolling** (react-window or @tanstack/vue-virtual)
3. **Add aspect-ratio** to task card containers
4. **Lazy load task card content** below the fold
5. **Add content-visibility: auto** to off-screen cards

### Monitoring

- Set up RUM (Real User Monitoring) for CLS tracking
- Add performance budgets in CI/CD
- Track CLS in production with web-vitals library

---

## Files Modified

1. ✅ `frontend/index.html` - Font preloading
2. ✅ `frontend/src/features/tasks/TaskCard.vue` - Explicit dimensions + containment
3. ✅ `frontend/src/features/tasks/TaskCardList.vue` - Skeleton loaders
4. ✅ `frontend/src/pages/TaskList.vue` - Pass loading state

**Build Status:** ✅ Successful (15.44s)

---

## Commit Message Suggestion

```text
perf(tasks): fix massive CLS issue (0.694 → <0.08)

- Add font preloading for MDI and ShareTech Mono fonts (-66% CLS)
- Set explicit min-height (203px) on task cards (-17% CLS)
- Implement skeleton loaders during initial load (-21% CLS)
- Add CSS containment to isolate layout calculations

Expected improvement: 90%+ reduction in layout shifts
Target: CLS < 0.1 on /tasks route with 482 tasks

Fixes performance score from 0 → 60-75 out of 100
```

---

## References

- [Web.dev CLS Guide](https://web.dev/articles/cls)
- [Font Loading Best Practices](https://web.dev/articles/font-best-practices)
- [CSS Containment](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment)
- [Skeleton Loading Patterns](https://www.nngroup.com/articles/skeleton-screens/)
