# Objective

- Reduce first-load and refresh latency across TarkovTracker frontend by identifying and mitigating bundle, rendering, and network bottlenecks.

## Scope & Constraints

- Targets Vue SPA delivered via Vite build, Firebase-hosted APIs, and Apollo GraphQL calls during bootstrapping.
- Excludes backend database optimizations beyond API response profiling and caching strategies.
- Works off branch `feature/perf-first-load`; avoid major refactors until diagnostics confirm necessity.

## Success Metrics

- Lighthouse (mobile) initial load scores: First Contentful Paint ≤ 2.5s, Largest Contentful Paint ≤ 3.0s, Total Blocking Time ≤ 200ms.
- Bundle health: initial JS payload ≤ 250KB gzip, main thread scripting during hydration ≤ 1.5s on mid-tier laptop profile.
- Repeat load verification: leverage HTTP caching to keep reload FCP ≤ 1.5s.

## Phase 1: Baseline & Instrumentation

### Build & Bundle Snapshot (Completed)

- `npm run build:frontend` (vite 7.1.10)
  - Build time: 5.38s; 1,515 modules transformed.
  - Primary bundle sizes (pre-gzip):
    - `index-B6JPW7hD.js` 322 KB (77 KB gzip)
    - `vuetify-DdNIbDNn.js` 274 KB (86 KB gzip)
    - `apollo-graphql-BuQRZDTs.js` 190 KB (55 KB gzip)
    - `composables-DYeK30Qw.js` 152 KB (53 KB gzip)
    - `firebase-BP9oE16y.js` 890 KB (209 KB gzip) ← exceeds 500 KB warning.
    - `vue-i18n-CGdU-ksk.js` 48 KB (17 KB gzip)
    - `stores-CbQSJCyG.js` 26 KB (8 KB gzip).
  - CSS payload dominated by Vuetify/theme: `vuetify-Cku55jD3.css` 393 KB (49 KB gzip), `index-o5CzAxER.css` 324 KB (51 KB gzip).

### Immediate Findings

- Firebase chunk accounts for ~27% of total JS payload; investigate tree-shaking and lazy loading for auth-dependent flows.
- Vuetify and global CSS total ~700 KB pre-gzip; evaluate component-level import optimization and critical CSS scope.
- `composables` bundle (tarkov data utilities) suggests shared helpers eager-loaded before route resolution.
- Manual chunking already groups vendors but still large; consider further splitting `firebase` and `vuetify` via dynamic imports and `optimizeDeps` configuration.

### TODOs

- Serve production build and capture Lighthouse/DevTools traces (pending).
- Collect HAR/network waterfall (pending).
- Review visualizer `dist/stats.html` treemap to quantify shared vs. route-specific bundles (in progress).
- Profile Apollo GraphQL bootstrap flow to isolate blocking UI window (in progress).
- DevTools trace (Chrome MCP, Oct 20): FCP 456ms, LCP 821ms, CLS 0.27, no long tasks detected; critical chain dominated by 2.5s GraphQL request (api.tarkov.dev).
- Navigation timings: DOMInteractive 43ms, DOMContentLoaded 238ms, Load 243ms.
- Three GraphQL fetches observed (start 206–230ms). Primary query blocks 2.27s on main chain despite deferred task processing change.

### Lighthouse / Trace Status

- Dev-server Lighthouse (desktop preset via MCP) reports severe regressions: FCP 29.9s, LCP 58.6s, TBT 9.7s, CLS 1.037 (Performance score ≈ 0). Indicates heavy synchronous boot or stalled network even in dev mode.
- Playwright browser automation now succeeds (Chromium installed via `npx playwright install chrome`); smoke test confirms dashboard renders once announcements and consent are dismissed.
- Chrome DevTools MCP still blocked: environment lacks X server for headful Chrome; requires headless configuration or xvfb.
- DevTools performance trace pending Chrome availability; consider capturing from host browser meanwhile.
- Playwright captured performance timings (dev server): DOMContentLoaded ~269ms, Load ~273ms, First Paint ~276ms, First Contentful Paint ~372ms, Time to First Byte ~48ms—suggesting Lighthouse slowdown occurs after initial paint due to heavy post-render processing.

### Visualizer Snapshot (Treemap, stats.html)

- Firebase bundle (`firebase-88ZxJhuM.js`) dominates >45% of JS footprint, pulling in analytics, auth, firestore, functions, and storage; candidate for lazy modular imports (e.g., `import('firebase/auth')` on-demand).
- Vuetify core and theme CSS chunks combine for ~35% of CSS payload; investigate treeshaking unused components and leveraging `transformAssetUrls` to reduce icon/font loading.
- `apollo-graphql` chunk includes full Apollo client, `graphql`, and caching subsystems; explore splitting GraphQL mutations/queries per route or deferring client creation until authenticated routes.
- `composables` chunk aggregates Tarkov data helpers, map utilities, and derived state; consider dynamic importing heavy map/data modules keyed to routes (`TarkovMap`, `NeededItems`).
- Large icon font files (`materialdesignicons`) inflate initial payload; evaluate subset strategy or using SVG sprites for critical icons.

## Phase 2: Bottleneck Investigation

1. **JavaScript Execution**
   - Audit heavy synchronous work in primary layout components, map rendering, Pinia store initialization.
   - Inspect `frontend/src/features` for components loaded at route root; flag expensive watchers/effects.
2. **Routing & Data Fetching**
   - Trace route guards, `onBeforeRouteEnter`, and Apollo queries triggered before first paint.
   - Evaluate Firebase auth initialization for delays; consider lazy loading non-critical services.
   - Capture performance profile around initial GraphQL queries to measure main-thread stall duration and identify heavy resolvers/cache hydration.
3. **Asset Delivery**
   - Review image/icon usage for splash content; ensure preloading of hero assets.
   - Confirm HTTP caching headers for static assets (Firebase hosting config).
   - Investigate LCP background image discovery (Sunset hero) and evaluate preloading or lighter placeholder to reduce 520ms render delay.

## Phase 3: Optimization Strategy

1. **Quick Wins**
   - Split map/render-heavy features via dynamic import.
   - Defer non-critical Pinia store hydration until after first paint.
   - Apply route-level code splitting for dashboard sub-features.
2. **Structural Improvements**
   - Introduce skeleton states for data-dependent components to minimize blocking renders.
   - Cache Apollo/Firebase queries where safe; leverage IndexedDB/localStorage for warm starts.
3. **Build-Level Tweaks**
   - Tune Vite chunking, enable preloading hints, and analyze legacy polyfills.
   - Evaluate `vite` `optimizeDeps` configuration for faster dev reloads.

## Phase 4: Validation & Regression Guardrails

1. **Testing Pipeline**
   - Automate Lighthouse CI run (`npm run build:frontend` + `npx lhci autorun`).
   - Maintain baseline JSON for diffing subsequent runs.
2. **Unit & Integration Checks**
   - `cd frontend && npm run test:run` after each significant change.
   - Smoke test Firebase functions if API shape altered.
3. **Documentation of Findings**
   - Record before/after metrics in issue tracker with trace links.
   - Summarize optimizations and remaining follow-up work.

## Risks & Mitigations

- **Lazy-loading regressions**: Ensure route guards handle dynamic imports; add vitest coverage for critical flows.
- **Auth timing issues**: Mock slow network to confirm lazy Firebase init does not break login.
- **Bundle growth creep**: Add `npm run build:frontend -- --watch` with size thresholds for ongoing monitoring.

## Next Actions

1. Execute Phase 1 benchmarking tasks and collect artifacts.
2. Schedule review to prioritize Phase 2 focus areas based on data.
3. Align with stakeholders on acceptable UX trade-offs (skeleton vs. blocking content).
4. Prototype non-blocking GraphQL loading flow (suspense/lazy hydration) once stall source confirmed.
