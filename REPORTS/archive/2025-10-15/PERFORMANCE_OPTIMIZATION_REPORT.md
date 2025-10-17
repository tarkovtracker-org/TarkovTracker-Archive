# TarkovTracker Performance Report — Outstanding Items

**Original Analysis**: 2025-10-14  
**Last Verified**: 2025-10-15  
**Scope**: All resolved findings from the October audit have been removed. The bullets below represent the remaining performance work only.

---

## Priority Snapshot

- 🟥 **P0 — Do Next**
  - Implement route-level code splitting in `frontend/src/router/routes.ts` so non-critical views load lazily.
  - Confirm Firebase is imported via modular APIs (`frontend/src/plugins/firebase.ts`, related composables) and shrink the Firebase chunk back toward ~200 KB.

- 🟧 **P1 — Upcoming Sprint**
  - Run the bundle analyzer (`vite build --analyze` or rollup visualizer) to validate chunk sizes and tree-shaking results.
  - Tune Vuetify tree-shaking (limit auto-imports, scope styles) to avoid bundling unused components/styles.
  - Capture bundle metrics in CI (size-limit or similar) to guard against regressions.

- 🟨 **P2 — Backlog**
  - Add build-time compression (Brotli/Gzip) for static assets before deploy.
  - Introduce performance observability: Firebase Performance Monitoring, Core Web Vitals reporting, and error tracking hooks.
  - Review Firestore read patterns for large team views to ensure indexes and field masks keep reads under free-tier targets.

---

## Task Details

### 🟥 Route Code Splitting

- **Goal**: Dynamic imports for every top-level route (`TaskList`, `TrackerDashboard`, `NeededItems`, etc.).  
- **Benefit**: Cuts initial bundle size by multiple megabytes and improves first-load TTI.  
- **Acceptance**: Lighthouse first-contentful-paint improves and analyzer shows route chunks.

### 🟥 Firebase Modular Imports

- **Goal**: Replace any default namespace imports with tree-shakable APIs (`initializeApp`, `getAuth`, `getFirestore`, etc.).  
- **Files to Inspect**: `frontend/src/plugins/firebase.ts`, `frontend/src/main.ts`, and any composables touching Firebase.  
- **Acceptance**: Analyzer reports Firebase chunks near ~200 KB and bundle diff confirms reduction (~470 KB saved).

### 🟧 Bundle Analyzer & Metrics

- **Goal**: Integrate rollup-plugin-visualizer (or equivalent) plus `size-limit` in CI.  
- **Acceptance**: `npm run build` produces analyzer output; CI fails if JS bundle > target thresholds.

### 🟧 Vuetify Tree-Shaking

- **Goal**: Configure Vuetify loader to import only used components and styles (`vuetify()` plugin options, scoped style sheets).  
- **Acceptance**: Vuetify CSS + JS bundles drop toward ~150 KB combined.

### 🟨 Build & Runtime Instrumentation

- **Goal**: Add Brotli/Gzip via `vite-plugin-compression`, wire up Firebase Performance Monitoring, and emit Core Web Vitals to analytics.  
- **Acceptance**: Deploy artifacts include compressed assets; dashboards capture FCP/LCP/CLS metrics.

### 🟨 Firestore Usage Review

- **Goal**: Audit team progress listeners for over-fetching, apply field masks, and adjust debouncing where possible.  
- **Acceptance**: Firestore usage reports show sustained reads within budget during team-heavy sessions.

---

## Next Steps Checklist

1. Update the router to lazy-load all feature views (confirm via analyzer output).  
2. Standardize Firebase imports and remove any lingering namespace imports.  
3. Add analyzer + size guardrails to the build pipeline.  
4. Re-run bundle analysis and log results in the performance dashboard.  
5. Tackle Vuetify tree-shaking once Firebase and routing changes land.  
6. Schedule observability and Firestore audits after bundle work ships.
