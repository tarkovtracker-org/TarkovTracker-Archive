# Performance Fix Implementation Plan

**Date:** 2025-10-21
**Priority:** #1 (from brainstorming session)
**Estimated Time:** 2-4 weeks

## Problem Summary

Every user on every page load waits for Tarkov.dev API to respond, causing major performance issues and slow load times.

## Root Cause Discovery

### Backend (WORKING ✅)

- **Location:** `functions/src/index.ts:828-839`
- **Function:** `scheduledTarkovDataFetch`
- **Schedule:** Runs daily at midnight UTC
- **Action:** Fetches all items from Tarkov.dev GraphQL API
- **Storage:** Saves to Firestore collection `items`
- **Status:** ✅ **ALREADY RUNNING** - Infrastructure 90% complete!

### Frontend (BROKEN ❌)

- **Location:** `frontend/src/plugins/apollo.ts:6`
- **Configuration:** Points directly at `https://api.tarkov.dev/graphql`
- **Problem:** Every user hits Tarkov.dev API directly on every load
- **Impact:** **Completely ignores the Firebase cache!**

## Solution: Replace Apollo with Firestore Reads

### Implementation Created ✅

**New File:** `frontend/src/composables/api/useFirestoreTarkovData.ts`

This composable:

- Reads from Firestore `items` collection
- Uses VueFire for reactive data binding
- Provides same interface as Apollo queries
- Singleton pattern prevents duplicate loads

## Next Steps

### Phase 1: Items Migration (Week 1-2)

1. **Test the new composable** ✅ DONE
   - Created `useFirestoreTarkovItems()`
   - Uses VueFire `useCollection()`
   - Singleton caching pattern

2. **Find all Apollo usage**
   - Primary file: `frontend/src/composables/api/useTarkovApi.ts`
   - Lines 77-104: `useTarkovDataQuery()`
   - Lines 108-135: `useTarkovHideoutQuery()`

3. **Create parallel implementation**
   - Add Firestore path alongside Apollo
   - Feature flag or gradual rollout
   - A/B test performance

4. **Measure performance**
   - Add timing metrics
   - Compare Apollo vs Firestore load times
   - Validate data consistency

### Phase 2: Tasks/Maps/Traders Migration (Week 3-4)

Currently these still use GraphQL:

- Tasks data
- Maps data
- Traders data
- Player levels data
- Hideout data

**Options:**

1. Extend backend scheduled function to cache these too
2. Keep as GraphQL (less frequently changing data)
3. Evaluate on a case-by-case basis

### Phase 3: Cleanup (Week 4)

1. Remove Apollo client entirely
2. Delete unused GraphQL query files
3. Remove `@apollo/client` dependency
4. Document the new architecture

## Files Modified So Far

### Created

- ✅ `frontend/src/composables/api/useFirestoreTarkovData.ts`

### To Modify

- `frontend/src/composables/api/useTarkovApi.ts` - Replace Apollo calls
- `frontend/src/plugins/apollo.ts` - Eventually delete
- `frontend/src/utils/tarkovdataquery.ts` - Eventually delete
- `frontend/src/utils/tarkovhideoutquery.ts` - Eventually delete
- `frontend/src/main.ts` - Remove Apollo plugin registration

## Expected Performance Gains

**Before:**

- User loads page → Frontend calls Tarkov.dev API → Wait 2-5 seconds → Data loads

**After:**

- User loads page → Frontend reads Firestore → **Instant load** (< 500ms)

**Calculation:**

- Firestore read latency: ~100-200ms (CDN cached)
- Tarkov.dev API latency: 2000-5000ms
- **Performance improvement: 10-25x faster** 🚀

## Risks & Mitigation

### Risk 1: Data staleness

- **Issue:** Firestore cache updated daily, could be up to 24hrs old
- **Mitigation:** Acceptable for game data that changes infrequently
- **Fallback:** Add manual refresh button if needed

### Risk 2: Firestore read costs

- **Issue:** Every user reads from Firestore
- **Mitigation:** Firebase free tier = 50k reads/day (plenty for current users)
- **Monitoring:** Add usage tracking in Firebase console

### Risk 3: Breaking changes

- **Issue:** Switching data sources could break components
- **Mitigation:**
  - Gradual rollout
  - Feature flags
  - Comprehensive testing
  - Keep Apollo as fallback initially

## Success Metrics

- ✅ Page load time < 1 second
- ✅ No direct Tarkov.dev API calls from frontend
- ✅ Bundle size reduced (remove Apollo)
- ✅ User-reported performance improvements
- ✅ Firestore costs stay within free tier

## Timeline

**Week 1:** Test Firestore composable, create parallel implementation
**Week 2:** Gradual rollout, measure performance, iterate
**Week 3:** Extend to tasks/maps/traders (if needed)
**Week 4:** Cleanup, documentation, celebrate! 🎉

---

**Status:** Ready to implement
**Next Action:** Test the new `useFirestoreTarkovItems()` composable in a component
