# Tasks Route Performance Analysis (482 Locked Tasks)

**Report Date:** 2025-10-27  
**Route:** `/tasks`  
**Scenario:** 482 "Locked" tasks displayed (worst-case large list scenario)

## Executive Summary

The `/tasks` route exhibits **severe performance and layout stability issues** when rendering large task lists. The primary concern is an extremely high Cumulative Layout Shift (CLS) score of **0.694**, which is **~2.8x worse** than the "poor" threshold of 0.25.

### Critical Metrics

| Metric | Value | Status | Threshold (Good) |
|--------|-------|--------|------------------|
| **Cumulative Layout Shift (CLS)** | **0.694** | 🔴 **POOR** | < 0.1 |
| First Contentful Paint (FCP) | 5.6s | 🔴 Poor | < 1.8s |
| Largest Contentful Paint (LCP) | 5.8s | 🔴 Poor | < 2.5s |
| Speed Index (SI) | 5.6s | 🔴 Poor | < 3.4s |
| Time to Interactive (TTI) | 7.0s | 🔴 Poor | < 3.8s |
| Total Blocking Time (TBT) | 162ms | 🟡 Fair | < 200ms |

**Performance Score:** 0-1 / 100 (effectively 0)

---

## Root Cause Analysis: Cumulative Layout Shift

### Primary Issues

#### 1. **Web Font Loading (Cause: 66% of CLS)**

**15 layout shifts detected**, with web fonts causing the two largest shifts:

- **Material Design Icons webfont** → CLS Score: **0.156** (22.5% of total)
  - URL: `materialdesignicons-webfont.woff2`
  - Shifts entire page background container: `#tracker-page-background-blur`
  - Container dimensions: 2245px × 10707px (massive shift area)

- **Share Tech Mono webfont** → CLS Score: **0.096** (13.8% of total)
  - URL: `ShareTechMono font.woff2`
  - Also shifts main background container
  
**Combined font shift score:** 0.252 (36% of total CLS)

#### 2. **Task Card Rendering (Cause: 17% of CLS)**

- Individual task card shift: CLS Score: **0.121** (17.4% of total)
  - Element: `.task-card-stack__item` for task `#task-5a27d2af86f7744e1115b323`
  - Dimensions: 1800px × 203px
  - 482 tasks loading = 482 potential layout shifts

#### 3. **Footer Shift (Cause: 21% of CLS)**

- Footer element shift: CLS Score: **0.147** (21.1% of total)
  - Element: `footer.v-footer`
  - Shifts as content above loads

### Affected Elements

```text
Main Container (#tracker-page-background-blur)
├── Web font loads → 2 major shifts (0.252 CLS)
├── Task Cards (482 items)
│   ├── Each card loads → individual shifts
│   └── Dynamic height calculation → cumulative shifting
└── Footer
    └── Pushed down as tasks render → 1 major shift (0.147 CLS)
```

---

## Specific Problem Areas

*Note: Code snippets in this section are representative examples and should be verified against the local repository for exact file paths and line numbers.*

### 1. **No Explicit Dimensions for Containers**

```html
<!-- Current (causes shifts) -->
<div id="tracker-page-background-blur" 
     style="flex: 1 1 auto; min-height: 100%; margin-bottom: 0px !important;">
```

- Height determined dynamically after content loads
- Each task card added pushes footer down
- No skeleton/placeholder heights

### 2. **Web Fonts Not Optimized**

- Material Design Icons webfont: **NOT preloaded**
- Share Tech Mono font: **NOT preloaded**
- No `font-display: optional` strategy
- Fonts block initial render

### 3. **Task Cards Lack Size Hinting**

```html
<div class="task-card-stack__item" id="task-5a27d2af86f7744e1115b323">
  <!-- No explicit height, width, or aspect-ratio -->
</div>
```

- 482 cards × unknown height = massive uncertainty
- Browser recalculates layout 482+ times

### 4. **No Virtual Scrolling**

- All 482 tasks rendered in DOM immediately
- 10,707px tall container (10.7 screens)
- Causes 162ms total blocking time

---

## Performance Impact Timeline

```text
0ms     ┌─ HTML parsed
        │
458ms   ├─ First paint (blank page visible)
        │
5627ms  ├─ First Contentful Paint (5.6s!)
        │  └─ Web fonts start loading
        │
~5800ms ├─ Font 1 loads → SHIFT 0.156 (background moves)
        ├─ Font 2 loads → SHIFT 0.096 (background moves again)
        │
~6000ms ├─ Task cards start rendering
        │  └─ Each card → small shifts (×482)
        │
7035ms  └─ Time to Interactive (7.0s!)
           └─ Footer settles → SHIFT 0.147
```

---

## Recommendations (Priority Order)

### 🔴 **CRITICAL - Fix Layout Shift (Target: CLS < 0.1)**

#### 1. **Preload Critical Web Fonts**

```html
<!-- In index.html <head> -->
<link rel="preload" 
      href="https://cdn.jsdelivr.net/npm/@mdi/font@latest/fonts/materialdesignicons-webfont.woff2" 
      as="font" 
      type="font/woff2" 
      crossorigin>
      
<link rel="preload" 
      href="https://fonts.gstatic.com/s/sharetechmono/v16/J7aHnp1uDWRBEqV98dVQztYldFcLowEFA87Heg.woff2" 
      as="font" 
      type="font/woff2" 
      crossorigin>
```

**AND** add font-display strategy:

```css
@font-face {
  font-family: 'Material Design Icons';
  font-display: optional; /* or 'swap' */
}
```

**Expected CLS reduction:** 0.252 → 0.05 (~80% improvement)

#### 2. **Add Explicit Dimensions to Task Cards**

```vue
<!-- TaskCard.vue or equivalent -->
<template>
  <div class="task-card-stack__item" 
       :style="{ minHeight: '203px' }"> <!-- Explicit height -->
    <!-- Card content -->
  </div>
</template>

<style scoped>
.task-card-stack__item {
  min-height: 203px; /* Matches observed height */
  contain: layout; /* CSS containment */
}
</style>
```

**Expected CLS reduction:** 0.121 → 0.02 (~85% improvement)

#### 3. **Implement Skeleton Loaders**

```vue
<!-- While tasks loading -->
<div v-if="loading" class="task-skeleton">
  <div v-for="n in estimatedTaskCount" 
       :key="`skeleton-${n}`"
       class="skeleton-card"
       style="height: 203px; margin-bottom: 8px;">
  </div>
</div>
```

**Expected CLS reduction:** Footer shift 0.147 → 0.01 (~93% improvement)

---

### 🟠 **HIGH - Implement Virtual Scrolling**

**Problem:** Rendering 482 DOM elements is expensive

**Solution:** Use `vue-virtual-scroller` or `@tanstack/vue-virtual`

```vue
<template>
  <RecycleScroller
    :items="tasks"
    :item-size="211" <!-- 203px + 8px margin -->
    key-field="id"
    v-slot="{ item }"
    class="task-list-scroller"
    :buffer="400">
    <TaskCard :task="item" />
  </RecycleScroller>
</template>
```

**Benefits:**

- Only renders ~20 visible cards (vs 482)
- Reduces initial render time: 5.6s → ~2s
- Reduces TTI: 7.0s → ~3s
- Reduces TBT: 162ms → ~50ms

---

### 🟡 **MEDIUM - Optimize Initial Load**

#### 4. **Defer Non-Critical Content**

- Load task metadata first (4 available tasks)
- Lazy-load "locked" tasks on scroll
- Use intersection observer for below-the-fold content

#### 5. **Add CSS Containment**

```css
.task-card-stack__item {
  contain: layout style paint;
  content-visibility: auto;
}
```

#### 6. **Optimize Vuetify Component Loading**

- Bundle splitting already done (278KB gzipped)
- Consider tree-shaking unused Vuetify components

---

## Expected Results After Fixes

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| CLS | 0.694 | **< 0.1** | **86% better** |
| FCP | 5.6s | **< 2s** | **64% faster** |
| LCP | 5.8s | **< 2.5s** | **57% faster** |
| TTI | 7.0s | **< 3.8s** | **46% faster** |
| Performance Score | 0-1 | **> 75** | **7500% better** 🎯 |

---

## Phased Rollout Plan

**Phase 1 — Critical CLS & Render Stability:**
- [ ] 1. Font preload links
- [ ] 2. `font-display: optional`
- [ ] 3. Explicit `min-height` on task cards
- [ ] 4. `contain: layout`
- [ ] 5. Skeleton loaders
*One-line description: Stabilize visual layout and prevent cumulative layout shift.*

**Phase 2 — Runtime List Optimizations:**
- [ ] 6. Virtual scroller
- [ ] 7. Intersection observer for lazy-loading
*One-line description: Optimize rendering and memory for large task lists.*

**Phase 3 — Verification & Audit:**
- [ ] 8. Test with 482 tasks
- [ ] 9. Test with various counts
- [ ] 10. Lighthouse audit
*One-line description: Validate performance improvements and measure final metrics.*
- [ ] 10. Run Lighthouse audit to confirm improvements

---

## Files to Modify

1. **`frontend/index.html`** - Add font preloads
1. **`frontend/src/components/TaskCard.vue`** - Add explicit dimensions
1. **`frontend/src/pages/Tasks.vue`** - Implement virtual scrolling
1. **`frontend/src/styles/fonts.css`** - Add font-display strategy
1. **`frontend/package.json`** - Add virtual scroller dependency

---

## Testing Strategy

### Before/After Comparison

```bash
# Run Lighthouse audit
npm run dev:firebase
# Navigate to http://localhost:5000/tasks
# Open DevTools > Lighthouse > Run audit

# Compare:
# - CLS score
# - LCP time
# - Visual stability (screenshot filmstrip)
```

### Load Testing Matrix

| Tasks | Expected CLS | Expected LCP |
|-------|--------------|--------------|
| 10 | < 0.05 | < 1.5s |
| 50 | < 0.08 | < 2.0s |
| 200 | < 0.09 | < 2.3s |
| 482 | < 0.10 | < 2.5s |

---

## Additional Notes

- **Current bundle size:** Not the primary issue (strategic splitting already done)
- **Network performance:** TTFB 123ms is acceptable
- **Main thread work:** 162ms TBT is borderline acceptable
- **Primary bottleneck:** Layout instability and rendering 482 elements

**The #1 priority is fixing CLS through font preloading and explicit dimensions.**
