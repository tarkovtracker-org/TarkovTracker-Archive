# Frontend Directory Structure

This document outlines the standardized directory structure for the TarkovTracker frontend.

## Directory Overview

```
src/
├── components/              # All Vue components
│   ├── ui/                 # Pure UI components (buttons, cards, inputs)
│   ├── layout/             # Layout components (navbar, footer, drawers)
│   └── domain/             # Business domain components
│       ├── tasks/           # Task-related components
│       ├── items/           # Item/needed items components
│       ├── maps/            # Map-related components
│       ├── team/            # Team management components
│       ├── settings/        # Settings components
│       ├── auth/            # Authentication components
│       └── hideout/         # Hideout components
├── views/                   # Page-level components
│   ├── auth/               # Authentication pages
│   ├── dashboard/          # Dashboard pages
│   ├── tasks/              # Task pages
│   ├── hideout/            # Hideout pages
│   ├── items/              # Item pages
│   ├── settings/           # Settings pages
│   ├── team/               # Team pages
│   ├── legal/              # Legal pages (privacy, terms)
│   └── docs/               # Documentation pages
├── composables/             # Vue composition functions
│   ├── api/                # API-related composables
│   ├── data/               # Data management composables
│   ├── tasks/              # Task-specific composables
│   ├── maps/               # Map-related composables
│   ├── firebase/           # Firebase integration composables
│   └── utils/              # Utility composables
├── stores/                  # Pinia state management
├── services/                # External service integrations
├── utils/                   # Utility functions
│   ├── migration/          # Data migration utilities
│   ├── validation/         # Data validation utilities
│   ├── api/                # API helper utilities
│   └── helpers/            # General helper functions
├── types/                   # TypeScript type definitions
│   ├── models/             # Domain models
│   └── api/                # API-related types
├── config/                  # Configuration files
├── router/                  # Vue Router configuration
├── styles/                  # Global styles
└── test/                    # Test utilities and setup
```

## Component Organization

### UI Components (`components/ui/`)
- Pure, reusable UI components
- No business logic
- Examples: `Button.vue`, `Card.vue`, `Modal.vue`

### Layout Components (`components/layout/`)
- Layout and navigation components
- Page structure components
- Examples: `NavBar.vue`, `Footer.vue`, `Sidebar.vue`

### Domain Components (`components/domain/*`)
- Business-specific components
- Contain domain logic
- Organized by feature area

## Views Organization

Views are page-level components that use domain and UI components. They should:
- Be minimal and focus on layout and orchestration
- Delegate business logic to composables and services
- Import components from `components/` directory

## Naming Conventions

### Files
- **Components**: `PascalCase.vue`
- **Views**: `*View.vue` (e.g., `DashboardView.vue`)
- **Composables**: `use*.ts` (e.g., `useTaskData.ts`)
- **Services**: `*Service.ts` (e.g., `TaskService.ts`)
- **Utils**: `camelCase.ts` (e.g., `formatDate.ts`)
- **Types**: `camelCase.ts` (e.g., `taskTypes.ts`)

### Directories
- **Plural for collections**: `components/`, `views/`, `utils/`
- **Singular for domain**: `task/`, `user/`, `team/`
- **kebab-case**: `feature-name/`

## Import Guidelines

### Use Absolute Imports
Always use the `@/` alias for absolute imports from src:
```typescript
import TaskCard from '@/components/domain/tasks/TaskCard.vue';
import { useTaskData } from '@/composables/data/useTaskData';
```

### Barrel Exports
Use barrel exports (`index.ts`) for cleaner imports:
```typescript
import { TaskCard, TaskActions } from '@/components/domain/tasks';
import { Button, Card } from '@/components/ui';
```

### Import Order
1. External libraries (Vue, VueRouter, etc.)
2. Internal utilities (`@/utils/`, `@/types/`)
3. Composables (`@/composables/`)
4. Components (`@/components/`)

## Best Practices

1. **Keep Components Small**: Aim for <300 lines per component
2. **Single Responsibility**: Each component should have one clear purpose
3. **Business Logic in Composables**: Move complex logic out of components
4. **Type Safety**: Use TypeScript interfaces for all data structures
5. **Consistent Naming**: Follow established naming conventions

This structure provides:
- Clear separation of concerns
- Easy navigation and discovery
- Scalable organization
- Consistent development patterns
- Better developer experience
