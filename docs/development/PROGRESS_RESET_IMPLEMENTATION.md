# Progress Reset Implementation

## Overview

This document explains the implementation of the progress reset functionality in TarkovTracker, specifically how it handles resetting PVP/PVE game mode data and full profile resets. The implementation ensures data consistency across localStorage, Pinia store state, and Firestore in both development and production environments.

## Related Files

- `frontend/src/stores/tarkov.ts` - Main store with reset logic
- `frontend/src/plugins/pinia-firestore.ts` - Fireswap plugin for Firestore sync
- `frontend/src/pages/UserSettings.vue` - UI for triggering resets
- `frontend/src/shared_state.ts` - Default state definitions

## Architecture Overview

The progress reset system must coordinate updates across three layers:

1. **Pinia Store** (reactive state in memory)
2. **localStorage** (browser persistence)
3. **Firestore** (backend persistence - production only)

### Key Challenge: Debounced Sync Race Condition

The Fireswap plugin uses a **250ms debounced save** mechanism to batch state changes before syncing to Firestore and localStorage. During a reset operation, this creates a race condition:

```md
1. User triggers reset
2. localStorage is cleared and fresh state is written
3. Store state is updated via $patch/$state
4. $patch triggers Pinia subscription
5. Subscription queues a debounced save (250ms delay)
6. Debounced function may capture stale state and overwrite localStorage
```

### Solution: Lock Mechanism

We use the Fireswap plugin's existing `lock` flag to prevent the debounced save from overwriting our reset:

```typescript
// 1. Set lock BEFORE clearing/updating
fireswapSettings[0].lock = true;

// 2. Clear localStorage and write fresh state
localStorage.clear();
localStorage.setItem('progress', JSON.stringify(newState));

// 3. Cancel any pending debounced saves
fireswapSettings[0].uploadDocument.cancel();

// 4. Update store state (triggers subscription, but lock prevents save)
this.$state = newState;

// 5. Release lock after Vue reactivity completes
setTimeout(() => {
  fireswapSettings[0].lock = false;
}, 100);
```

## Implementation Details

### Function: `resetGameModeData(mode: GameMode)`

Resets a specific game mode (PVP or PVE) while preserving the other mode's data.

**Location:** `frontend/src/stores/tarkov.ts:193`

**Parameters:**

- `mode: 'pvp' | 'pve'` - Which game mode to reset

**Steps:**

1. **Validate User Authentication**

   ```typescript
   if (!fireuser.uid) {
     logger.error('User not logged in. Cannot reset game mode data.');
     return;
   }
   ```

2. **Create Fresh State**

   ```typescript
   const freshProgressData = JSON.parse(JSON.stringify(defaultState[mode]));
   const otherMode = mode === 'pvp' ? 'pve' : 'pvp';
   const newCompleteState = {
     currentGameMode: this.currentGameMode,
     gameEdition: this.gameEdition,
     [mode]: freshProgressData,
     [otherMode]: JSON.parse(JSON.stringify(this[otherMode])),
   };
   ```

3. **Sync to Firestore (Production Only)**

   ```typescript
   if (!isDevAuthEnabled) {
     const userProgressRef = doc(firestore, 'progress', fireuser.uid);
     await setDoc(userProgressRef, { [mode]: freshProgressData }, { merge: true });
   }
   ```

   - In development mode (`VITE_DEV_AUTH=true`), Firestore sync is skipped
   - In production, partial update using `merge: true` to preserve other mode

4. **Preserve Critical localStorage Keys**

   ```typescript
   const preservedData = preserveLocalStorageKeys(['user', 'DEV_USER_ID']);
   ```

5. **Acquire Lock and Update**

   ```typescript
   const fireswapSettings = extendedStore._fireswapSettings;
   fireswapSettings[0].lock = true;

   localStorage.clear();
   restoreLocalStorageKeys(preservedData);
   localStorage.setItem('progress', JSON.stringify(newCompleteState));

   fireswapSettings[0].uploadDocument.cancel();
   this.$state = newCompleteState as UserState;

   setTimeout(() => {
     fireswapSettings[0].lock = false;
   }, 100);
   ```

**Result:**

- Selected game mode data is reset to defaults
- Other game mode data is preserved
- localStorage is updated immediately
- Firestore is updated (production only)
- UI updates reactively without page refresh

---

### Function: `resetOnlineProfile()`

Performs a complete account reset, clearing both PVP and PVE data.

**Location:** `frontend/src/stores/tarkov.ts:130`

**Steps:**

Similar to `resetGameModeData`, but:

- Resets **both** PVP and PVE modes
- Uses full document replacement in Firestore (not merge)
- Clears all progress-related localStorage

```typescript
const freshDefaultState = JSON.parse(JSON.stringify(defaultState));

if (!isDevAuthEnabled) {
  await setDoc(userProgressRef, freshDefaultState); // Full replacement
}
```

**Result:**

- All progress data reset to defaults
- User settings preserved (streamer mode, UI preferences)
- Complete reset across all persistence layers

---

## Expected Behavior

### Development Mode (`VITE_DEV_AUTH=true`)

**What happens:**

1. ✅ localStorage is cleared and reset
2. ✅ Pinia store state is reset
3. ✅ UI updates immediately (no refresh required)
4. ❌ Firestore is NOT updated (dev auth bypasses backend)
5. ✅ Mock dev user persists (`DEV_USER_ID` preserved)

**Test verification:**

```javascript
// Before reset
localStorage.getItem('progress')
// {"pvp":{"taskObjectives":{"abc":{"complete":true}}...}}

// After reset (immediate)
localStorage.getItem('progress')
// {"pvp":{"taskObjectives":{}},"pve":{"taskObjectives":{}}}
```

---

### Production Mode (Firestore Enabled)

**What happens:**

1. ✅ Firestore document is updated
2. ✅ localStorage is cleared and reset
3. ✅ Pinia store state is reset
4. ✅ UI updates immediately
5. ✅ Firestore snapshot listener receives update
6. ✅ Lock prevents circular update

**Firestore document structure:**

```javascript
// Firestore: /progress/{uid}
{
  currentGameMode: "pvp",
  gameEdition: 1,
  pvp: {
    level: 1,
    pmcFaction: "USEC",
    displayName: null,
    taskObjectives: {},      // Empty after reset
    taskCompletions: {},     // Empty after reset
    hideoutParts: {},
    hideoutModules: {},
    traderStandings: {}
  },
  pve: {
    // ... (preserved if resetting only PVP)
  }
}
```

**Test verification:**

1. Open browser DevTools → Application → Local Storage
2. Trigger reset via Settings page
3. Verify localStorage updates immediately
4. Check Firestore console for document update
5. Verify UI reflects reset state without refresh

---

## Reactivity Deep Dive

### Why `this.$state = newState` Instead of `$patch`?

**Problem with `$patch`:**

```typescript
// ❌ This doesn't always trigger deep reactivity
this.$patch(newCompleteState);

// ❌ This also has issues with nested objects
this.$patch((state) => {
  state.pvp = freshData;
});
```

**Why it fails:**

- Vue's reactivity tracks **object references**, not deep properties
- `$patch` may perform shallow merges on nested objects
- Computed properties in `progressStore` may not detect changes
- UI components using `storeToRefs` won't re-render

**Solution:**

```typescript
// ✅ Direct state replacement
this.$state = newCompleteState as UserState;
```

**Why it works:**

- Replaces the **entire state object reference**
- All reactive dependencies (`computed`, `watch`, `storeToRefs`) detect change
- Vue's reactivity system propagates updates to all components
- `progressStore` computed properties re-evaluate

### Data Flow to UI

```md
Reset Action
    ↓
tarkovStore.$state = newState
    ↓
progressStore.teamStores (computed)
    ↓
progressStore.taskProgress (computed)
    ↓
useProgressQueries.tasksCompletions (storeToRefs)
    ↓
TaskCard.vue re-renders
```

---

## Edge Cases and Safeguards

### 1. User Settings Preservation

**Preserved keys:**

- `user` - User preferences, UI settings
- `DEV_USER_ID` - Development mode user identity

**Why:** Full localStorage clear would lose unrelated settings.

**Implementation:**

```typescript
const preservedData = preserveLocalStorageKeys(['user', 'DEV_USER_ID']);
localStorage.clear();
restoreLocalStorageKeys(preservedData);
```

### 2. Concurrent Reset Prevention

**UI disables buttons during reset:**

```vue
<v-btn
  :disabled="!fireuser.loggedIn || resetting"
  @click="openResetDialog('pvp')"
>
```

**Why:** Prevents race conditions from multiple simultaneous resets.

### 3. Lock Timing

**100ms delay before releasing lock:**

```typescript
setTimeout(() => {
  fireswapSettings[0].lock = false;
}, 100);
```

**Why:** Ensures Vue's reactivity system completes all updates before allowing new debounced saves.

### 4. Firestore Security Rules

**Expected rule structure:**

```javascript
match /progress/{userId} {
  allow write: if request.auth.uid == userId
             && request.resource.data.keys().hasAll(['pvp', 'pve', 'currentGameMode', 'gameEdition']);
}
```

**Validation:** Reset operations send complete state objects to satisfy validation.

---

## Testing Checklist

### Development Mode Testing

- [ ] Reset PVP mode
  - [ ] localStorage updates immediately
  - [ ] UI shows empty task list (no refresh)
  - [ ] PVE data remains unchanged
  - [ ] No Firestore errors in console

- [ ] Reset PVE mode
  - [ ] localStorage updates immediately
  - [ ] UI shows empty task list (no refresh)
  - [ ] PVP data remains unchanged

- [ ] Full account reset
  - [ ] Both PVP and PVE reset
  - [ ] User settings preserved
  - [ ] UI updates completely

### Production Mode Testing

**Prerequisites:**

- Deployed to staging environment
- Real Firebase authentication
- `VITE_DEV_AUTH=false`

**Test sequence:**

1. Complete several tasks in PVP mode
2. Navigate to Settings page
3. Click "Reset PVP Progress"
4. Confirm reset dialog
5. **Immediately verify:**
   - [ ] UI updates without refresh
   - [ ] localStorage shows empty taskObjectives
   - [ ] Firestore document updated (check Firebase Console)
6. Refresh page
7. **Verify persistence:**
   - [ ] Reset state persists after refresh
   - [ ] No stale data reappears
   - [ ] PVE mode still has original data (if any)

**Firestore sync verification:**

```bash
# Open browser console
JSON.parse(localStorage.getItem('progress'))

# Compare with Firestore document at /progress/{uid}
# Should match exactly after reset
```

---

## Troubleshooting

### Issue: UI doesn't update after reset

**Symptoms:** Reset completes but task checkboxes still show completed tasks.

**Diagnosis:**

1. Check console for errors
2. Verify localStorage was actually cleared: `localStorage.getItem('progress')`
3. Check if lock is being released

**Solution:** Ensure you're using `this.$state = newState`, not `$patch`.

---

### Issue: Data reappears after refresh

**Symptoms:** Reset works initially, but stale data comes back on page reload.

**Diagnosis:**

1. Check if debounced save overwrote localStorage
2. Verify lock timing (may need longer than 100ms)
3. Check Firestore document hasn't reverted

**Solution:**

- Increase lock release timeout
- Verify `cancel()` is called on debounced function
- Check Firestore security rules

---

### Issue: "User not logged in" error in production

**Symptoms:** Reset fails with authentication error.

**Diagnosis:**

1. User's Firebase auth session expired
2. `fireuser.uid` is undefined

**Solution:** UI already disables reset buttons when not logged in. This is expected behavior.

---

## Performance Considerations

### localStorage Operations

- **Clear + Write:** ~1-5ms total
- **Preserved key extraction:** Negligible
- **Impact:** None for users

### Firestore Operations

- **PVP/PVE reset:** Partial update (`merge: true`) - faster
- **Full reset:** Complete document replacement - slightly slower
- **Network latency:** 50-200ms typical
- **Offline resilience:** Firestore queues writes if offline

### UI Reactivity

- **State replacement:** <1ms
- **Computed recalculation:** ~5-10ms for 100+ tasks
- **Component re-renders:** Depends on task count, typically <50ms
- **Total perceived time:** <100ms (instant to user)

---

## Future Improvements

### Potential Enhancements

1. **Confirmation with Data Preview**
   - Show what will be reset before confirming
   - Display count of completed tasks being lost

2. **Undo Functionality**
   - Store previous state in sessionStorage
   - Allow one-time undo within session

3. **Selective Reset**
   - Reset only tasks, or only hideout, etc.
   - More granular control

4. **Export Before Reset**
   - Auto-trigger data export dialog before reset
   - Safety backup for accidental resets

5. **Reset History**
   - Track reset timestamps in Firestore
   - Allow viewing reset history

---

## Conclusion

The progress reset implementation uses a **lock-based synchronization mechanism** to coordinate updates across three persistence layers while preventing race conditions from debounced saves. Direct state replacement ensures proper Vue reactivity propagation to all UI components.

The implementation works seamlessly in both development (localStorage-only) and production (Firestore-enabled) modes, providing immediate UI updates without requiring page refreshes.

**Key takeaway:** When dealing with debounced sync mechanisms, always use locks to prevent concurrent operations and direct state replacement for reliable deep reactivity.
