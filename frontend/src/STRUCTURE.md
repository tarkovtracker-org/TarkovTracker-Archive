# Frontend Workspace Structure Handbook

> **Purpose:** Comprehensive guide to the TarkovTracker frontend directory organization, naming conventions, and responsibility boundaries  
> **Audience:** Frontend contributors and AI agents implementing new features

This document provides a complete mapping of the frontend source tree with concrete examples and patterns for organized development.

## Table of Contents

- [Directory Overview](#directory-overview)
- [Component Organization](#component-organization)
  - [UI Components](#ui-components-componentsui)
  - [Layout Components](#layout-components-componentslayout)
  - [Domain Components](#domain-components-componentsdomain)
- [Views Organization](#views-organization)
- [Composables Architecture](#composables-architecture)
  - [API Integration](#api-integration-composablesapi)
  - [Feature-Specific Composables](#feature-specific-composables)
  - [Data Management](#data-management)
- [Store Architecture](#store-architecture)
- [Utility Organization](#utility-organization)
- [Naming Conventions](#naming-conventions)
- [State Management Patterns](#state-management-patterns)
  - [Shared State Integration](#shared-state-integration)
  - [Store/Composable Interaction](#storecomposable-interaction)
  - [Feature Implementation Pattern](#feature-implementation-pattern)
  - [Integration with shared_state.ts](#integration-with-shared_statets)
  - [Composable Subdirectory Organization](#composable-subdirectory-organization)
- [Import Guidelines](#import-guidelines)
  - [Absolute Imports with @/ Alias](#absolute-imports-with--alias)
  - [Import Order](#import-order)
  - [Barrel Exports](#barrel-exports)
- [Best Practices](#best-practices)
- [Quick Reference for Common Tasks](#quick-reference-for-common-tasks)
  - [Adding a New Feature](#adding-a-new-feature)
  - [Finding Existing Code](#finding-existing-code)
  - [Testing Patterns](#testing-patterns)

## Directory Overview

```
src/
├── App.vue                  # Root Vue application component
├── main.ts                  # Application entry point
├── shared_state.ts          # Shared state interfaces and defaults (13.5KB)
├── components/              # All Vue components organized by scope
│   ├── ui/                 # Pure UI components (buttons, cards, inputs)
│   ├── layout/             # Layout components (navbar, footer, drawers)
│   └── domain/             # Business domain components
│       ├── auth/            # Authentication components
│       ├── hideout/         # Hideout components
│       ├── items/           # Item/needed items components
│       ├── maps/            # Map-related components
│       ├── needed-items/    # Needed items feature components
│       ├── settings/        # Settings components
│       ├── tasks/           # Task-related components
│       └── team/            # Team management components
├── views/                   # Page-level components (*View.vue naming)
│   ├── auth/               # Authentication pages
│   ├── dashboard/          # Dashboard pages
│   ├── hideout/            # Hideout pages
│   ├── items/              # Item pages
│   ├── legal/              # Legal pages (privacy, terms)
│   ├── maps/               # Map pages
│   ├── settings/           # Settings pages
│   ├── team/               # Team pages
│   └── tasks/              # Task pages
├── composables/             # Vue composition functions (use* pattern)
│   ├── __tests__/          # Composable tests
│   ├── api/                # API integration composables
│   │   ├── useTarkovApi.ts # Main GraphQL API composable
│   │   └── useFirestoreTarkovData.ts # Firestore data composable
│   ├── data/               # Data management composables
│   ├── firebase/           # Firebase integration composables
│   ├── hideout/            # Hideout-specific composables
│   ├── maps/               # Map-related composables
│   ├── tasks/              # Task-specific composables
│   │   ├── useTaskList.ts  # Task list management
│   │   ├── useTaskFiltering.ts # Task filtering logic
│   │   └── useTaskVirtualization.ts # Virtual scrolling
│   └── utils/              # Utility composables
├── stores/                  # Pinia state management stores
│   ├── __tests__/          # Store tests
│   ├── utils/              # Store utilities
│   ├── app.ts              # Application-wide store
│   ├── preferences.ts      # User preferences store
│   ├── progress.ts         # Progress tracking store
│   ├── tarkov.ts           # Tarkov game data store
│   ├── team.ts             # Team management store
│   ├── ui-settings.ts     # UI settings store
│   ├── user.ts             # User authentication/profile store
│   ├── useSystemStore.ts   # System-level store
│   └── useTeamStore.ts     # Team-specific store (legacy)
├── services/                # External service integrations
├── utils/                   # Utility functions
│   ├── __tests__/          # Utility tests
│   ├── api/                # API helper utilities
│   ├── graphql/           # GraphQL utilities
│   ├── migration/          # Data migration utilities
│   └── validation/         # Data validation utilities
├── types/                   # TypeScript type definitions
│   ├── models/             # Domain models
│   ├── ApiMigrationTypes.ts # API migration types
│   ├── global.d.ts         # Global type declarations
│   └── vite-env.d.ts       # Vite environment types
├── config/                  # Configuration files
├── plugins/                 # Vue plugin configurations
├── router/                  # Vue Router configuration
├── styles/                  # Global styles
├── test/                    # Test utilities and setup
└── locales/                 # Internationalization files
```

## Component Organization

### UI Components (`components/ui/`)
Pure, reusable UI components without business logic.

**Current Examples:**
- Button components, input fields, cards, modals
- Design system building blocks
- No direct dependency on stores or composables

**Pattern:**
```vue
<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

defineProps<Props>();
</script>
```

### Layout Components (`components/layout/`)
Layout and navigation components that structure the application.

**Current Examples:**
- Navigation bars, sidebars, footers
- App shells and page layouts
- Responsive containers

**Pattern:**
- Focus on structure, not content
- May use UI components but not domain-specific logic

### Domain Components (`components/domain/*`)
Business-specific components organized by feature area.

**Current Feature Areas:**
- `auth/` - Authentication components (AuthButtons.vue)
- `hideout/` - Hideout management (HideoutCard.vue, StationLink.vue)
- `items/` - Item display (NeededItem.vue, NeededItemRow.vue)
- `maps/` - Map features (MapMarker.vue)
- `needed-items/` - Needed items feature components
- `settings/` - Settings components (ApiTokens.vue)
- `tasks/` - Task management (TaskLink.vue)
- `team/` - Team features (TeammemberCard.vue)

**Pattern:**
```vue
<script setup lang="ts">
import { useTaskStore } from '@/stores/task';
import { useTaskData } from '@/composables/data/useTaskData';

const store = useTaskStore();
const { filteredTasks } = useTaskData();
</script>
```

## Views Organization

Views are page-level components that orchestrate domain and UI components.

**Current Views:**
- `auth/` - Authentication pages
- `dashboard/` - Dashboard pages (DashboardView.vue)
- `hideout/` - Hideout pages (HideoutView.vue)
- `items/` - Item pages (ItemsView.vue)
- `legal/` - Legal pages (privacy, terms)
- `maps/` - Map pages
- `settings/` - Settings pages
- `team/` - Team pages
- `tasks/` - Task pages

**View Pattern:**
```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useTaskStore } from '@/stores/task';
import TaskList from '@/components/domain/tasks/TaskList.vue';
import TaskFilters from '@/components/domain/tasks/TaskFilters.vue';

const store = useTaskStore();

onMounted(() => {
  store.loadTasks();
});
</script>

<template>
  <v-container>
    <TaskFilters />
    <TaskList :items="store.tasks" />
  </v-container>
</template>
```

## Composables Architecture

Composables are organized by scope and follow the `use*` naming pattern.

### API Integration (`composables/api/`)
**Key Files:**
- `useTarkovApi.ts` - Main GraphQL API integration (17KB)
- `useFirestoreTarkovData.ts` - Firestore data caching

**Pattern:**
```typescript
export function useTarkovApi() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  async function fetchData<T>(query: string): Promise<T | null> {
    // API logic
  }
  
  return { loading, error, fetchData };
}
```

### Feature-Specific Composables
**Task Composables (`composables/tasks/`):**
- `useTaskList.ts` - Task list management (20KB)
- `useTaskFiltering.ts` - Task filtering logic (14KB)
- `useTaskVirtualization.ts` - Virtual scrolling
- `useTaskFiltering.ts` - Filter logic

**Root-Level Composables:**
- `useNeededItems.ts` - Needed items management (7KB)
- `useNeededItemsSettings.ts` - Settings for needed items
- `useUserLevel.ts` - User level calculations
- `useUserStores.ts` - User store integration

### Data Management
**Core Files:**
- `shared_state.ts` - Central state interfaces and defaults (13.5KB)
- Defines interfaces for `TaskObjective`, `TaskCompletion`, `UserProgressData`

## Store Architecture

Pinia stores are organized by responsibility with Composition API style.

### Primary Stores
- `user.ts` - User authentication and profile (13KB)
- `progress.ts` - Progress tracking (8KB)
- `tarkov.ts` - Game data management (16KB)
- `team.ts` - Team management (3KB)
- `preferences.ts` - User preferences (5KB)
- `ui-settings.ts` - UI preferences (8KB)

**Store Pattern:**
```typescript
export const useTaskStore = defineStore('task', () => {
  // State
  const items = ref<Task[]>([]);
  const loading = ref(false);
  
  // Computed
  const completedItems = computed(() => 
    items.value.filter(item => item.complete)
  );
  
  // Actions
  async function loadItems() {
    loading.value = true;
    try {
      items.value = await fetchTasks();
    } finally {
      loading.value = false;
    }
  }
  
  return {
    items,
    loading,
    completedItems,
    loadItems,
  };
});
```

## Utility Organization

### Utils Directory (`utils/`)
**Key Categories:**
- `api/` - API helper utilities
- `graphql/` - GraphQL utilities and client setup
- `migration/` - Data migration utilities
- `validation/` - Data validation utilities

**Important Files:**
- `api_permissions.ts` - API permission definitions
- `constants.ts` - Application constants
- `debounce.ts` - Debounce utilities
- `encryption.ts` - Encryption utilities (5KB)
- `errorHandler.ts` - Error handling utilities (8KB)
- `logger.ts` - Logging utilities

## Naming Conventions

### Files
- **Components**: `PascalCase.vue`
  - Examples: `TaskLink.vue`, `HideoutCard.vue`, `NeededItem.vue`
- **Views**: `*View.vue` 
  - Examples: `DashboardView.vue`, `ItemsView.vue`, `HideoutView.vue`
- **Composables**: `use*.ts`
  - Examples: `useTaskList.ts`, `useNeededItems.ts`, `useUserLevel.ts`
- **Stores**: `camelCase.ts`
  - Examples: `progress.ts`, `preferences.ts`, `ui-settings.ts`
- **Utils**: `camelCase.ts`
  - Examples: `debounce.ts`, `logger.ts`, `constants.ts`
- **Types**: `camelCase.ts` or `PascalCase.ts`
  - Examples: `ApiMigrationTypes.ts`, `global.d.ts`

### Directories
- **Plural for collections**: `components/`, `views/`, `utils/`, `stores/`
- **Singular for domain features**: `task/`, `user/`, `team/` (within domain areas)
- **kebab-case for multi-word features**: `needed-items/`, `ui-settings/`

## State Management Patterns

### Shared State Integration
The `shared_state.ts` file defines core interfaces that bridge stores and composables:

```typescript
// Import shared types in stores and composables
import type { UserProgressData, GameMode } from '@/shared_state';

export const useUserStore = defineStore('user', () => {
  // Use shared interfaces
  const currentGameMode = ref<GameMode>('pvp');
  const pvp = ref<UserProgressData>(defaultProgressData);
  const pve = ref<UserProgressData>(defaultProgressData);
});
```

### Store/Composable Interaction
**Recommended Pattern (from NEW_FEATURE_TEMPLATE.md):**
1. Store handles state persistence and business logic
2. Composables provide reactive computations and UI-specific logic
3. Views orchestrate stores and composables
4. Domain components consume store state and composable computations

```typescript
// Store - state and persistence
const userStore = useUserStore();

// Composable - UI-specific logic
const { filteredItems, displayFormat } = useItemFiltering(userStore.items);

// Component - presentation only
<ItemCard v-for="item in filteredItems" :key="item.id" :item="item" />
```

### Feature Implementation Pattern

When implementing a new feature, follow this store/composable/view trio pattern:

**1. Store Layer (State & Persistence)**
```typescript
// stores/myFeature.ts
export const useMyFeatureStore = defineStore('myFeature', () => {
  // State
  const items = ref<MyFeatureItem[]>([]);
  const currentFilter = ref<MyFilter>('all');
  const loading = ref(false);
  
  // Computed
  const hasItems = computed(() => items.value.length > 0);
  
  // Actions
  async function loadItems() {
    loading.value = true;
    try {
      const data = await fetchFromAPI('/api/myfeature');
      items.value = data;
    } finally {
      loading.value = false;
    }
  }
  
  function setFilter(filter: MyFilter) {
    currentFilter.value = filter;
  }
  
  return {
    items,
    currentFilter,
    loading,
    hasItems,
    loadItems,
    setFilter,
  };
});
```

**2. Composable Layer (UI Logic & Computation)**
```typescript
// composables/useMyFeatureLogic.ts
export function useMyFeatureLogic() {
  const store = useMyFeatureStore();
  
  // Computed with business logic
  const filteredItems = computed(() => {
    switch (store.currentFilter) {
      case 'active':
        return store.items.filter(item => item.active);
      case 'completed':
        return store.items.filter(item => item.completed);
      default:
        return store.items;
    }
  });
  
  // UI-specific formatting
  const displayItems = computed(() => 
    filteredItems.value.map(item => ({
      ...item,
      displayName: formatDisplayName(item),
      statusColor: getStatusColor(item.status),
    }))
  );
  
  // UI actions
  async function refreshItems() {
    await store.loadItems();
  }
  
  function handleFilterChange(filter: MyFilter) {
    store.setFilter(filter);
  }
  
  return {
    // State (readonly from store)
    items: readonly(store.items),
    loading: readonly(store.loading),
    // Computed
    displayItems,
    filteredItems,
    // Actions
    refreshItems,
    handleFilterChange,
  };
}
```

**3. View Layer (Orchestration)**
```vue
<!-- views/myFeature/MyFeatureView.vue -->
<script setup lang="ts">
import { onMounted } from 'vue';
import { useMyFeatureLogic } from '@/composables/useMyFeatureLogic';
import MyFeatureList from '@/components/domain/myFeature/MyFeatureList.vue';
import MyFeatureFilters from '@/components/domain/myFeature/MyFeatureFilters.vue';

const {
  items,
  loading,
  displayItems,
  refreshItems,
  handleFilterChange,
} = useMyFeatureLogic();

onMounted(() => {
  refreshItems();
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1>My Feature</h1>
      </v-col>
    </v-row>
    
    <v-row>
      <v-col cols="12" md="3">
        <MyFeatureFilters @filter-change="handleFilterChange" />
      </v-col>
      <v-col cols="12" md="9">
        <MyFeatureList 
          :items="displayItems"
          :loading="loading"
          @refresh="refreshItems"
        />
      </v-col>
    </v-row>
  </v-container>
</template>
```

### Integration with `shared_state.ts`

The `shared_state.ts` file provides common interfaces that should be used across stores and composables:

```typescript
// Import shared interfaces
import type { 
  UserProgressData, 
  TaskObjective, 
  TaskCompletion,
  GameMode 
} from '@/shared_state';

// Use in stores
export const useUserStore = defineStore('user', () => {
  const currentGameMode = ref<GameMode>('pvp');
  const pvp = ref<UserProgressData>(defaultProgressData);
  const pve = ref<UserProgressData>(defaultProgressData);
  
  // Game mode switching logic
  function switchGameMode(mode: GameMode) {
    currentGameMode.value = mode;
    // Additional switching logic
  }
  
  return {
    currentGameMode,
    pvp,
    pve,
    switchGameMode,
  };
});
```

### Composable Subdirectory Organization

For complex features, organize composables into subdirectories:

```
composables/tasks/
├── index.ts                 # Barrel exports
├── useTaskList.ts          # Main task list logic
├── useTaskFiltering.ts     # Filtering logic
├── useTaskVirtualization.ts # Virtual scrolling
├── useTaskActions.ts       # Task actions (complete, reset)
└── __tests__/
    ├── useTaskList.test.ts
    └── useTaskFiltering.test.ts
```

**Index Barrel Export:**
```typescript
// composables/tasks/index.ts
export { useTaskList } from './useTaskList';
export { useTaskFiltering } from './useTaskFiltering';
export { useTaskVirtualization } from './useTaskVirtualization';
export { useTaskActions } from './useTaskActions';
```

**Usage:**
```typescript
// Clean import from barrel
import { 
  useTaskList, 
  useTaskFiltering, 
  useTaskActions 
} from '@/composables/tasks';
```

## Import Guidelines

### Absolute Imports with `@/` Alias
Always use absolute imports from the src root:

```typescript
// Correct
import TaskCard from '@/components/domain/tasks/TaskCard.vue';
import { useTaskData } from '@/composables/data/useTaskData';
import { TaskStore } from '@/stores/task';

// Avoid relative imports
import TaskCard from '../../../components/domain/tasks/TaskCard.vue';
```

### Import Order
1. External libraries (Vue, VueRouter, Vuetify, etc.)
2. Type imports (`import type`)
3. Internal utilities (`@/utils/`, `@/types/`, `@/shared_state`)
4. Composables (`@/composables/`)
5. Stores (`@/stores/`)
6. Components (`@/components/`)

### Barrel Exports
Use barrel exports (`index.ts`) for clean feature-area imports:

```typescript
// components/domain/tasks/index.ts
export { default as TaskCard } from './TaskCard.vue';
export { default as TaskList } from './TaskList.vue';
export { default as TaskFilters } from './TaskFilters.vue';

// Usage
import { TaskCard, TaskList, TaskFilters } from '@/components/domain/tasks';
```

## Best Practices

1. **Keep Components Small**: Aim for <300 lines per component
2. **Single Responsibility**: Each file has one clear purpose
3. **Business Logic in Composables/Stores**: Move complex logic out of components
4. **Type Safety**: Use TypeScript interfaces for all data structures
5. **Consistent Naming**: Follow established naming conventions
6. **Feature Colocation**: Keep related files together (components, composables, tests)
7. **Lazy Loading**: Use dynamic imports for heavy features
8. **Reactive Patterns**: Prefer ref/computed over reactive for clarity

## Quick Reference for Common Tasks

### Adding a New Feature

1. **Define Types**: Create interfaces in `types/models/` or use shared interfaces from `shared_state.ts`
2. **Create Store**: Add store in `stores/` with Composition API pattern
3. **Create Composables**: Add composables in `composables/` or feature subdirectory
4. **Create Components**: Add domain components in `components/domain/{feature}/`
5. **Create View**: Add view in `views/{feature}/FeatureView.vue`
6. **Add Route**: Register in `router/index.ts`

### Finding Existing Code

- **UI Components**: `components/ui/` (buttons, cards, inputs)
- **Feature Components**: `components/domain/{feature}/`
- **Business Logic**: `composables/` and `stores/`
- **API Integration**: `composables/api/`
- **Type Definitions**: `types/models/` and `shared_state.ts`
- **Utility Functions**: `utils/`

### Testing Patterns

- **Component Tests**: Co-locate with components in `__tests__/` directories
- **Store Tests**: `stores/__tests__/`
- **Composable Tests**: `composables/__tests__/` or feature subdirectories

This structure provides:
- Clear separation of concerns
- Easy navigation and discovery
- Scalable organization
- Consistent development patterns
- Better developer experience
- Maintainable codebase

---

**Related Documentation:**
- [NEW_FEATURE_TEMPLATE.md](../../../docs/NEW_FEATURE_TEMPLATE.md) - Step-by-step feature implementation
- [DEVELOPMENT.md](../../../docs/DEVELOPMENT.md) - Development workflows and setup
- [AGENTS.md](../../../AGENTS.md) - AI agent workflow guidelines
