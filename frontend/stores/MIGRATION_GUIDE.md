# User Store Refactoring - Migration Guide

## Overview

The large `user.ts` store (460+ lines) has been refactored into focused, single-responsibility stores:

- **Preferences Store** (`stores/preferences.ts`) - User preferences and content filtering
- **UI Settings Store** (`stores/ui-settings.ts`) - Display preferences and layout settings  
- **Team Store** (`stores/team.ts`) - Team-related visibility settings
- **Legacy Compatibility Store** (`stores/user.ts`) - Backward compatibility layer

## Quick Start

For new components, import directly from the new stores:

```typescript
import { usePreferencesStore } from '@/stores/preferences';
import { useUiSettingsStore } from '@/stores/ui-settings';
import { useTeamStore } from '@/stores/team';

// Or use the convenience composable for initialization
import { useUserStores } from '@/composables/useUserStores';

const { preferencesStore, uiSettingsStore, teamStore } = useUserStores();
```

## Migration Steps

### 1. Identify Current Dependencies

Check if the component imports `useUserStore`:

```typescript
import { useUserStore } from '@/stores/user';
```

### 2. Map Old State to New Stores

| Old Property | New Store | New Property |
|--------------|-----------|--------------|
| `allTipsHidden`, `hideTips`, `showTip()` | Preferences | Same properties |
| `streamerMode`, `setStreamerMode()` | Preferences | Same properties |
| `hideGlobalTasks`, `setHideGlobalTasks()` | Preferences | Same properties |
| `hideNonKappaTasks`, `setHideNonKappaTasks()` | Preferences | Same properties |
| `hideKappaRequiredTasks`, `setHideKappaRequiredTasks()` | Preferences | Same properties |
| `hideLightkeeperRequiredTasks`, `setHideLightkeeperRequiredTasks()` | Preferences | Same properties |
| `hideEodOnlyTasks`, `setHideEodOnlyTasks()` | Preferences | Same properties |
| `taskPrimaryView`, `setTaskPrimaryView()` | UI Settings | Same properties |
| `taskMapView`, `setTaskMapView()` | UI Settings | Same properties |
| `taskTraderView`, `setTaskTraderView()` | UI Settings | Same properties |
| `taskSecondaryView`, `setTaskSecondaryView()` | UI Settings | Same properties |
| `taskUserView`, `setTaskUserView()` | UI Settings | Same properties |
| `neededTypeView`, `setNeededTypeView()` | UI Settings | Same properties |
| `itemsHideNonFIR`, `setItemsNeededHideNonFIR()` | UI Settings | Same properties |
| `neededitemsStyle`, `setNeededItemsStyle()` | UI Settings | Same properties |
| `hideoutPrimaryView`, `setHideoutPrimaryView()` | UI Settings | Same properties |
| `showOptionalTaskRequirementLabels`, `setShowOptionalTaskRequirementLabels()` | UI Settings | Same properties |
| `showRequiredTaskRequirementLabels`, `setShowRequiredTaskRequirementLabels()` | UI Settings | Same properties |
| `showExperienceRewards`, `setShowExperienceRewards()` | UI Settings | Same properties |
| `showNextTasks`, `setShowNextTasks()` | UI Settings | Same properties |
| `showPreviousTasks`, `setShowPreviousTasks()` | UI Settings | Same properties |
| `showTaskIds`, `setShowTaskIds()` | UI Settings | Same properties |
| `teamHide`, `toggleHidden()` | Team | Same properties |
| `taskTeamHideAll`, `setQuestTeamHideAll()` | Team | Same properties |
| `itemsTeamHideAll`, `setItemsTeamHideAll()` | Team | Same properties |
| `itemsTeamHideNonFIR`, `setItemsTeamHideNonFIR()` | Team | Same properties |
| `itemsTeamHideHideout`, `setItemsTeamHideHideout()` | Team | Same properties |
| `mapTeamHideAll`, `setMapTeamHideAll()` | Team | Same properties |

### 3. Example Migration

**Before:**
```typescript
import { useUserStore } from '@/stores/user';

export default defineComponent({
  setup() {
    const userStore = useUserStore();
    
    const toggleTip = (tipKey: string) => {
      if (userStore.showTip(tipKey)) {
        userStore.hideTip(tipKey);
      }
    };
    
    const setView = (view: string) => {
      userStore.setTaskPrimaryView(view);
    };
    
    return { userStore, toggleTip, setView };
  }
});
```

**After:**
```typescript
import { usePreferencesStore, useUiSettingsStore } from '@/stores';

export default defineComponent({
  setup() {
    const preferencesStore = usePreferencesStore();
    const uiSettingsStore = useUiSettingsStore();
    
    const toggleTip = (tipKey: string) => {
      if (preferencesStore.showTip(tipKey)) {
        preferencesStore.hideTip(tipKey);
      }
    };
    
    const setView = (view: string) => {
      uiSettingsStore.setTaskPrimaryView(view);
    };
    
    return { preferencesStore, uiSettingsStore, toggleTip, setView };
  }
});
```

### 4. Template Updates

Update template bindings to use the new store instances:

```vue
<!-- Before -->
<v-btn @click="userStore.setStreamerMode(!userStore.streamerMode)">
  Streamer Mode: {{ userStore.streamerMode }}
</v-btn>

<!-- After -->
<v-btn @click="preferencesStore.setStreamerMode(!preferencesStore.streamerMode)">
  Streamer Mode: {{ preferencesStore.streamerMode }}
</v-btn>
```

## Migration Scripts

### Find Components Using User Store

```bash
rg "useUserStore" frontend/src --type vue
```

### Components to Update (Initial List)

- `components/ui/TrackerTip.vue`
- `components/domain/items/useNeedVisibility.ts`
- `components/domain/team/TeamOptions.vue`
- `components/domain/team/TeammemberCard.vue`
- `components/domain/items/NeededItem.vue`
- `components/domain/tasks/TaskCard.vue`
- `components/layout/OverflowMenu.vue`
- `components/domain/tasks/TaskCardObjectives.vue`
- `components/domain/settings/TokenCard.vue`
- `components/layout/DrawerAccount.vue`
- `components/domain/tasks/TaskCardInfo.vue`
- `views/items/ItemsView.vue`
- `views/dashboard/DashboardView.vue`
- `views/hideout/HideoutView.vue`
- `views/settings/UserSettingsView.vue`

## Benefits of the Refactor

1. **Better Separation of Concerns** - Each store has a single, clear responsibility
2. **Improved Maintainability** - Smaller, focused stores are easier to understand and modify
3. **Better Testability** - Each store can be tested in isolation
4. **Enhanced Performance** - Smaller stores reduce reactivity overhead
5. **Cleaner Imports** - Components only import what they need
6. **Future-Proof** - Easy to extend specific areas without affecting others

## Legacy Compatibility

The `user.ts` store now serves as a compatibility layer that:
- Maps old API calls to new stores
- Maintains backward compatibility during transition
- Allows gradual migration of components

**Important**: The compatibility layer should be removed once all components are migrated.

## Testing

All new stores have comprehensive test coverage:
- `preferences.spec.ts` - 16 tests
- `ui-settings.spec.ts` - 21 tests  
- `team.spec.ts` - 17 tests

Run tests with:
```bash
npm run test:run -- stores/__tests__/preferences.spec.ts
npm run test:run -- stores/__tests__/ui-settings.spec.ts
npm run test:run -- stores/__tests__/team.spec.ts
```

## Gotchas

1. **Getter vs Method Access**: In Pinia, getters are accessed as properties, not methods
   - ❌ `store.getStreamerMode()`
   - ✅ `store.getStreamerMode`

2. **Reactivity**: The legacy compatibility layer uses computed properties for state
   - Direct state mutation won't work with the legacy store
   - Use the new stores for direct mutation

3. **Persistence**: Each store manages its own localStorage key
   - `user-preferences` - preferences store
   - `user-ui-settings` - UI settings store  
   - `user-team` - team store

## Support

For questions or issues during migration:
1. Check this guide first
2. Look at existing examples in migrated components
3. Review the test files for usage patterns
4. Check the store files for API documentation
