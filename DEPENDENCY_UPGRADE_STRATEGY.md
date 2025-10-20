# TarkovTracker Dependency Upgrade Strategy

**Updated:** 2025-02-15  
**Status:** 5 of 6 major upgrades completed ✅

## ✅ Completed Upgrades (2025-02-15)

All of the following upgrades have been successfully completed, tested, and validated:

- **@types/node** (functions): 22.18.11 → 24.x
- **jsdom** (frontend): 26.1.0 → 27.x
- **uuid** (frontend): 11.1.0 → 13.x
- **firebase** (frontend): 11.10.0 → 12.x
- **@intlify/unplugin-vue-i18n** (frontend): 6.0.8 → 11.x

All builds passing, all tests passing (192 frontend unit tests, 75 functions unit tests).

## ⚠️ Partially Upgraded / Blocked

| Area | Package | Current | Target | Status | Notes |
|------|---------|---------|--------|--------|-------|
| Frontend GraphQL | `@apollo/client` | 3.13.0 | 4.x | **BLOCKED** | Currently at 3.13.0 (not 3.14.0 due to `rehackt`/React dependency issue in Vue apps). Apollo 4.x blocked by `@vue/apollo-composable@4.2.2` requiring ^3.4.13. Waiting for @vue/apollo-composable v5.x with Apollo 4.x support. |

**Known Issues:**
- **Apollo Client 3.14.0**: Introduces `rehackt` dependency that expects React as optional peer dependency, causing errors in Vue applications. Staying on 3.13.0 until resolved or 4.x becomes available.

**Action Required:** Monitor <https://github.com/vuejs/apollo> for @vue/apollo-composable v5.x release that adds Apollo Client 4.x compatibility.

## Upgrade Checklists

### 1. Apollo Client 4.x (frontend)

1. Install requirements:

   ```bash
   cd frontend
   npm install rxjs @apollo/client@^4.0.0
   npx @apollo/client-codemod-migrate-3-to-4 src
   ```

2. Review codemod output and ensure no React-specific imports remain.
3. Regression-test GraphQL data (items, quests, hideout, market views).
4. Run `npm run test:run` and `npm run test:e2e`.

### 2. Firebase Web SDK 12.x (frontend)

1. Audit for removed APIs:

   ```bash
   cd frontend
   rg "dynamicLinks|admob" src
   ```

2. Upgrade package and align with root:

   ```bash
   npm install firebase@^12.4.0
   ```

3. Revalidate authentication, Firestore listeners, and VueFire integration with emulators.

### 3. @intlify/unplugin-vue-i18n 11.x (frontend)

1. Search for deprecated patterns:

   ```bash
   cd frontend
   rg "\\btc\(|\\$tc\(" src
   rg "v-t" src
   rg "jitCompilation|optimizeTranslationDirective" vite.config.ts
   ```

2. Upgrade package and remove deprecated Vite options if present:

   ```bash
   npm install @intlify/unplugin-vue-i18n@^11.0.0
   ```

3. Replace `tc/$tc` with plural parameters on `t/$t`, convert `v-t` directives to template expressions, then run translation smoke tests.

### 4. uuid 13.x (frontend)

1. Confirm imports already use ESM (`import { v4 as uuidv4 } from 'uuid'`).
2. Upgrade and run unit tests:

   ```bash
   cd frontend
   npm install uuid@^13.0.0
   npm run test:run
   ```

### 5. jsdom 27.x (frontend dev dependency)

1. Upgrade and re-run Vitest to confirm test environment stability:

   ```bash
   cd frontend
   npm install jsdom@^27.0.0 --save-dev
   npm run test:run
   ```

### 6. @types/node 24.x (functions)

1. Upgrade typings and rebuild:

   ```bash
   cd functions
   npm install @types/node@^24.0.0 --save-dev
   npm run build
   npm test
   ```

## Post-upgrade validation

- Frontend: `npm run build`, `npm run test:run`, `npm run test:e2e`, plus manual smoke tests across auth, team flows, and GraphQL data loads.
- Functions: `npm run build --workspace=functions`, `npm test --workspace=functions`.
- Monitor for new runtime warnings and any significant bundle size changes after the Apollo upgrade.

## Rollback guidance

- Keep backup copies of `package.json` and `package-lock.json` for each workspace before upgrading.
- If an upgrade fails, restore the backups, run `npm install`, and repeat the validation commands above.

---

**Maintainer note:** Remove the relevant section once each upgrade is completed and validated.
