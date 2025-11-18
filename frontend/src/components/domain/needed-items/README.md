# Needed Items Components

This directory contains the refactored needed items functionality, extracted from the monolithic `ItemsView.vue`.

## Architecture

The needed items functionality has been split into:

### Components

- **NeededItemsFilter.vue**: Handles view tabs, search input, and settings dialog
- **NeededItemsList.vue**: Renders the paginated list of needed items with loading states

### Composables

- **useNeededItems.ts**: Main state management for needed items (pagination, filtering, infinite scroll)
- **useNeededItemsSettings.ts**: Manages display settings (style, visibility toggles)

## Component Responsibilities

### NeededItemsFilter
- Renders view tabs (All, Tasks, Hideout)
- Provides search input with debounced filtering
- Opens settings dialog for display options
- Emits events for search and view changes

### NeededItemsList
- Renders task items when view is 'all' or 'tasks'
- Renders hideout items when view is 'all' or 'hideout'
- Shows loading indicators
- Provides load more button for pagination
- Handles infinite scroll loading state

## Composable APIs

### useNeededItems
```typescript
const {
  itemFilterNameText,      // Search text input value
  activeNeededView,        // Currently active view
  neededTaskItems,         // Filtered/paginated task items
  neededHideoutItems,      // Filtered/paginated hideout items
  loading,                // Loading state for tasks
  hideoutLoading,          // Loading state for hideout
  hasMoreItems,           // Whether more items can be loaded
  loadMoreItems,          // Function to load more items
  neededViews,            // View configuration
} = useNeededItems();
```

### useNeededItemsSettings
```typescript
const {
  neededItemsStyle,       // Display style: 'mediumCard' | 'smallCard' | 'row'
  hideFIR,               // Hide non-FIR items
  hideFIRLabel,           // i18n label for FIR toggle
  hideFIRColor,           // Color for FIR toggle
  itemsHideAll,           // Hide all team items
  itemsHideAllLabel,       // i18n label for hide all
  itemsHideAllColor,       // Color for hide all
  itemsHideNonFIR,        // Hide non-FIR team items
  itemsHideNonFIRLabel,    // i18n label for non-FIR
  itemsHideNonFIRColor,    // Color for non-FIR
  itemsHideHideout,        // Hide hideout items
  itemsHideHideoutLabel,    // i18n label for hideout
  itemsHideHideoutColor,    // Color for hideout
} = useNeededItemsSettings();
```

## Benefits of Refactoring

1. **Separation of Concerns**: Filter logic is separated from list rendering
2. **Testability**: Each component and composable can be tested in isolation
3. **Reusability**: Components can be reused in other contexts
4. **Maintainability**: Smaller, focused files are easier to understand and modify
5. **Performance**: Debounced filtering and efficient pagination
6. **Type Safety**: Proper TypeScript interfaces for all APIs

## Migration Notes

- The original `ItemsView.vue` now acts as an orchestrator
- Legacy `provide/inject` pattern is maintained for compatibility
- All existing functionality is preserved
- No breaking changes to the public API
