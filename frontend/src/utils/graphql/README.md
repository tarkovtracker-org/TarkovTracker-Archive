# GraphQL Schema Structure

This directory contains the modularized GraphQL schema for TarkovTracker.

## Structure

### Before Refactoring
- Single massive `fragments.ts` file (~200 lines)
- Single monolithic `queries.ts` file (~440 lines)
- No type safety
- Poor maintainability

### After Refactoring
- **`items.ts`** - Item-related fragments (ammunition, armor, medical, etc.)
- **`tasks.ts`** - Task and objective fragments
- **`hideout.ts`** - Hideout module and craft fragments  
- **`traders.ts`** - Trader and barter fragments
- **`maps.ts`** - Map data fragments
- **`presets.ts`** - Weapon preset fragments
- **`queries.ts`** - Main query composed from fragments
- **`types.ts`** - TypeScript type definitions
- **`index.ts`** - Barrel exports for easy importing

## Benefits

1. **Modularity** - Each domain has its own file
2. **Maintainability** - Easier to find and modify specific fragments
3. **Type Safety** - Full TypeScript support
4. **Reusability** - Fragments can be imported independently
5. **Testing** - Individual fragment testing possible

## Usage

```typescript
// Import everything
import { tarkovDataQuery } from '@/utils/graphql';

// Or import specific fragments
import { itemDataFragment, taskFragment } from '@/utils/graphql';

// Import types
import { ItemData, TaskData } from '@/utils/graphql';
```

## Query Composition

The main `tarkovDataQuery` is composed by:
1. Importing all required fragments
2. Including fragment definitions in the GraphQL string
3. Using fragment spreading in query fields

This ensures the same functionality as before but with better organization.
