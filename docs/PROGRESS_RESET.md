# Progress Reset System

> **Audience:** Frontend developers  
> **Purpose:** High-level overview of progress reset architecture and race condition handling

High-level overview of the progress reset functionality for resetting PVP/PVE game mode data and full profile resets.

## Overview

TarkovTracker allows users to reset their progress for specific game modes (PVP or PVE) or perform full profile resets. The system ensures data consistency across three persistence layers:

1. **Pinia Store** – Reactive in-memory state
2. **localStorage** – Browser persistence
3. **Firestore** – Backend persistence (production only)

---

## Architecture Challenge

The Fireswap plugin uses a **250ms debounced save** mechanism to batch state changes before syncing. During reset operations, this creates a potential race condition where stale state could overwrite freshly reset data.

**Problem Flow:**
```
User triggers reset
  → localStorage cleared and fresh state written
  → Store updated with $patch
  → Debounced save queued (250ms delay)
  → Debounced function might capture stale state
  → localStorage overwritten with old data ❌
```

---

## Solution: Lock Mechanism

The implementation uses the Fireswap plugin's `lock` flag to prevent debounced saves during reset operations:

```typescript
// 1. Lock BEFORE clearing
fireswapSettings[0].lock = true;

// 2. Clear and write fresh state
localStorage.clear();
localStorage.setItem('progress', JSON.stringify(newState));

// 3. Cancel pending saves
fireswapSettings[0].uploadDocument.cancel();

// 4. Update store (lock prevents overwrite)
this.$state = newState;

// 5. Release lock after Vue reactivity completes
setTimeout(() => {
  fireswapSettings[0].lock = false;
}, 100);
```

---

## Implementation Functions

### `resetGameModeData(mode: 'pvp' | 'pve')`

Resets a specific game mode while preserving the other mode's data.

**Location:** `frontend/src/stores/tarkov.ts`

**Key Steps:**
1. Validate user authentication
2. Create fresh state for target mode
3. Sync to Firestore (production only)
4. Use lock mechanism to update local state
5. Force Fireswap sync and wait for completion

### `resetAllProgress()`

Performs a complete profile reset (both PVP and PVE).

**Location:** `frontend/src/stores/tarkov.ts`

**Key Steps:**
1. Validate user authentication
2. Create fresh state for both modes
3. Clear Firestore document (production only)
4. Use lock mechanism to reset all local state
5. Clear all localStorage and reinitialize

---

## Development vs Production

**Production (`VITE_DEV_AUTH=false`):**
- Full three-layer sync (Pinia → localStorage → Firestore)
- Lock mechanism prevents race conditions
- Fireswap plugin handles debounced persistence

**Development (`VITE_DEV_AUTH=true`):**
- Two-layer sync only (Pinia → localStorage)
- No Firestore operations
- Mock user ID persisted in localStorage

---

## Testing

**Manual Testing:**
1. Enable dev auth: `VITE_DEV_AUTH=true`
2. Perform reset operations
3. Verify localStorage cleared correctly
4. Confirm state persists across page reload

**Production Testing:**
1. Use Firebase emulator suite (`npm run dev:full`)
2. Verify Firestore updates occur
3. Test concurrent operations (tabs, devices)
4. Confirm no data loss or stale overwrites

---

## Related Files

- `frontend/src/stores/tarkov.ts` – Reset logic implementation
- `frontend/src/plugins/pinia-firestore.ts` – Fireswap plugin configuration
- `frontend/src/pages/UserSettings.vue` – Reset UI triggers
- `docs/archive/PROGRESS_RESET_IMPLEMENTATION.md` – Detailed implementation docs
