# New Feature Template

> **Purpose:** A step-by-step checklist for adding end-to-end features (backend + frontend) to TarkovTracker  
> **Audience:** Developers and AI agents implementing new functionality

This template provides a repeatable pattern for adding new full-stack features while maintaining code quality and consistency with existing patterns.

---

## Table of Contents

- [Reference Examples](#reference-examples)
- [Backend Implementation](#backend-implementation)
- [Frontend Implementation](#frontend-implementation)
- [Testing Requirements](#testing-requirements)
- [Documentation & Deployment](#documentation--deployment)
- [Checklist Summary](#checklist-summary)

---

## Reference Examples

Before starting, review these well-structured examples:

**Backend (Progress Feature):**
- Service: `functions/src/services/ProgressService.ts`
- Handler: `functions/src/handlers/progressHandler.ts`
- Types: `functions/src/types/api.ts`
- Tests: `functions/test/integration/handlers/progressHandler.test.ts`

**Frontend (Progress Feature):**
- Store: `frontend/src/stores/progress.ts`
- Composables: `frontend/src/composables/data/useTaskData.ts`
- View: `frontend/src/views/tasks/TaskListView.vue`
- Components: `frontend/src/components/domain/tasks/`

---

## Backend Implementation

### Step 1: Define Types

**Location:** `functions/src/types/api.ts` or domain-specific type file

**What to add:**
- Request/response interfaces
- Domain model types
- Validation schemas

**Example:**
```typescript
export interface MyFeatureRequest {
  fieldName: string;
  optionalField?: number;
}

export interface MyFeatureResponse {
  id: string;
  status: string;
  timestamp: number;
}
```

### Step 2: Create Service Class

**Location:** `functions/src/services/MyFeatureService.ts`

**Pattern to follow:**
```typescript
import { logger } from 'firebase-functions/v2';
import type { Firestore } from 'firebase-admin/firestore';
import { errors } from '../middleware/errorHandler';
import { createLazyFirestore } from '../utils/factory';

export class MyFeatureService {
  private getDb: () => Firestore;

  constructor() {
    this.getDb = createLazyFirestore();
  }

  private get db(): Firestore {
    return this.getDb();
  }

  /**
   * Primary method with proper error handling
   */
  async myFeatureOperation(
    userId: string,
    data: MyFeatureRequest
  ): Promise<MyFeatureResponse> {
    try {
      // Business logic here
      const result = await this.performOperation(userId, data);
      
      logger.log('Operation completed successfully', { userId });
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }
      logger.error('Error in myFeatureOperation:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw errors.internal('Failed to perform operation');
    }
  }

  private async performOperation(
    userId: string,
    data: MyFeatureRequest
  ): Promise<MyFeatureResponse> {
    // Implementation details
    // Use transactions for multi-step writes
    // Use proper Firestore references
    return { id: userId, status: 'success', timestamp: Date.now() };
  }
}
```

**Key patterns:**
- ✅ Use lazy Firestore initialization via `createLazyFirestore()`
- ✅ Wrap operations in try-catch with proper logging
- ✅ Use transactions for multi-step updates
- ✅ Separate public methods from private helpers
- ✅ Use structured logging with context
- ✅ Throw typed errors from `middleware/errorHandler`

### Step 3: Create Handler

**Location:** `functions/src/handlers/myFeatureHandler.ts`

**Pattern to follow:**
```typescript
import type { Request, Response } from 'express';
import type { ApiResponse, ApiToken } from '../types/api';
import { MyFeatureService } from '../services/MyFeatureService';
import { ValidationService } from '../services/ValidationService';
import { asyncHandler } from '../middleware/errorHandler';
import { createLazy } from '../utils/factory';

// Lazy service initialization
const getMyFeatureService = createLazy(() => new MyFeatureService());

interface AuthenticatedRequest extends Request {
  apiToken?: ApiToken;
  user?: {
    id: string;
    username?: string;
  };
}

/**
 * @openapi
 * /myfeature:
 *   post:
 *     summary: "Description of what this endpoint does"
 *     tags:
 *       - "MyFeature"
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fieldName
 *             properties:
 *               fieldName:
 *                 type: string
 *                 description: "Description of field"
 *               optionalField:
 *                 type: integer
 *                 description: "Optional field description"
 *     responses:
 *       200:
 *         description: "Operation completed successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: "Invalid request parameters"
 *       401:
 *         description: "Unauthorized"
 *       500:
 *         description: "Internal server error"
 */
export const myFeatureHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = ValidationService.validateUserId(req.apiToken?.owner);
    const requestData = ValidationService.validateMyFeatureRequest(req.body);

    const result = await getMyFeatureService().myFeatureOperation(
      userId,
      requestData
    );

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  }
);
```

**Key patterns:**
- ✅ Use `asyncHandler` wrapper for error handling
- ✅ Add comprehensive `@openapi` annotations
- ✅ Validate all inputs via `ValidationService`
- ✅ Return standardized `ApiResponse` format
- ✅ Use lazy service initialization
- ✅ Type the request interface properly

### Step 4: Add Validation

**Location:** `functions/src/services/ValidationService.ts`

**Add validation method:**
```typescript
static validateMyFeatureRequest(body: unknown): MyFeatureRequest {
  if (!body || typeof body !== 'object') {
    throw errors.badRequest('Request body is required');
  }

  const { fieldName, optionalField } = body as Record<string, unknown>;

  if (typeof fieldName !== 'string' || !fieldName.trim()) {
    throw errors.badRequest('fieldName must be a non-empty string');
  }

  if (optionalField !== undefined && typeof optionalField !== 'number') {
    throw errors.badRequest('optionalField must be a number');
  }

  return { fieldName, optionalField };
}
```

### Step 5: Export Handler

**Location:** `functions/src/handlers/index.ts`

**Add export:**
```typescript
export { myFeatureHandler, myFeatureOtherHandler } from './myFeatureHandler';
```

### Step 6: Wire Routes

**Location:** `functions/src/app/app.ts`

**Add routes in `setupRoutes` function:**
```typescript
// MyFeature endpoints
app.post('/api/myfeature', requirePermission('WP'), myFeatureHandler);
app.post('/api/v2/myfeature', requirePermission('WP'), myFeatureHandler);
```

**Permission options:**
- `GP` - Get Progress (read)
- `WP` - Write Progress (write)
- `TP` - Team Progress (team read)

### Step 7: Regenerate OpenAPI

**After completing handler annotations:**
```bash
npm run docs:generate
```

This will:
1. Build functions
2. Generate `functions/openapi/openapi.json`
3. Copy spec to `frontend/public/api/openapi.json`

**Verify changes:**
```bash
git diff functions/openapi/openapi.json
```

---

## Frontend Implementation

### Step 1: Define Frontend Types

**Location:** `frontend/src/types/models/myFeature.ts`

**What to add:**
```typescript
export interface MyFeature {
  id: string;
  status: string;
  timestamp: number;
}

export interface MyFeatureRequest {
  fieldName: string;
  optionalField?: number;
}
```

**Tip:** Keep types in sync with backend where applicable, but frontend may have additional UI-specific types.

### Step 2: Create API Client Method

**Location:** `frontend/src/composables/api/useMyFeatureApi.ts`

**Pattern to follow:**
```typescript
import { ref } from 'vue';
import { firebaseGetTokenForAPI } from '@/plugins/firebase';

export function useMyFeatureApi() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function myFeatureOperation(
    data: MyFeatureRequest
  ): Promise<MyFeature | null> {
    loading.value = true;
    error.value = null;

    try {
      const token = await firebaseGetTokenForAPI();
      const response = await fetch('/api/myfeature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error';
      return null;
    } finally {
      loading.value = false;
    }
  }

  return {
    myFeatureOperation,
    loading,
    error,
  };
}
```

**Key patterns:**
- ✅ Return composable with operation methods + loading/error state
- ✅ Use `firebaseGetTokenForAPI()` for authentication
- ✅ Handle errors gracefully
- ✅ Use proper TypeScript types

### Step 3: Create Store (if needed)

**Location:** `frontend/src/stores/myFeature.ts`

**When to create a store:**
- State needs to be shared across multiple components
- State should persist across route changes
- Complex state management logic

**Pattern to follow:**
```typescript
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useMyFeatureApi } from '@/composables/api/useMyFeatureApi';
import type { MyFeature } from '@/types/models/myFeature';

export const useMyFeatureStore = defineStore('myFeature', () => {
  // State
  const items = ref<MyFeature[]>([]);
  const currentItem = ref<MyFeature | null>(null);
  
  // API composable
  const api = useMyFeatureApi();

  // Computed
  const hasItems = computed(() => items.value.length > 0);
  const sortedItems = computed(() => 
    [...items.value].sort((a, b) => b.timestamp - a.timestamp)
  );

  // Actions
  async function fetchItems() {
    // Implementation
  }

  async function performOperation(data: MyFeatureRequest) {
    const result = await api.myFeatureOperation(data);
    if (result) {
      items.value.push(result);
    }
    return result;
  }

  function clearItems() {
    items.value = [];
    currentItem.value = null;
  }

  return {
    // State
    items,
    currentItem,
    // Computed
    hasItems,
    sortedItems,
    // Actions
    fetchItems,
    performOperation,
    clearItems,
    // Loading/error from API
    loading: api.loading,
    error: api.error,
  };
});
```

**Key patterns:**
- ✅ Use Composition API style (`defineStore` with setup function)
- ✅ Organize into state, computed, and actions sections
- ✅ Use ref/computed from Vue
- ✅ Integrate API composables
- ✅ Export loading/error state

### Step 4: Create Composables (if needed)

**Location:** `frontend/src/composables/myFeature/useMyFeatureLogic.ts`

**When to create composables:**
- Reusable logic across multiple components
- Complex computations or data transformations
- Integrating multiple stores/services

**Pattern to follow:**
```typescript
import { computed } from 'vue';
import { useMyFeatureStore } from '@/stores/myFeature';

export function useMyFeatureLogic() {
  const store = useMyFeatureStore();

  const processedItems = computed(() => {
    // Complex logic here
    return store.sortedItems.map(item => ({
      ...item,
      displayName: formatDisplay(item),
    }));
  });

  function formatDisplay(item: MyFeature): string {
    // Format logic
    return `${item.id}: ${item.status}`;
  }

  return {
    items: processedItems,
    loading: store.loading,
    error: store.error,
    performOperation: store.performOperation,
  };
}
```

### Step 5: Create Domain Components

**Location:** `frontend/src/components/domain/myFeature/`

**Structure:**
```
myFeature/
├── MyFeatureCard.vue         # Display single item
├── MyFeatureList.vue         # Display list of items
├── MyFeatureForm.vue         # Form for creating/editing
└── composables/
    └── useMyFeatureCard.ts   # Component-specific logic
```

**Component pattern:**
```vue
<script setup lang="ts">
import { computed } from 'vue';
import type { MyFeature } from '@/types/models/myFeature';

interface Props {
  item: MyFeature;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  action: [id: string];
}>();

const displayStatus = computed(() => {
  return props.item.status.toUpperCase();
});

function handleAction() {
  emit('action', props.item.id);
}
</script>

<template>
  <v-card>
    <v-card-title>{{ item.id }}</v-card-title>
    <v-card-text>
      <div>Status: {{ displayStatus }}</div>
      <div>Timestamp: {{ item.timestamp }}</div>
    </v-card-text>
    <v-card-actions>
      <v-btn
        :loading="loading"
        @click="handleAction"
      >
        Action
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
```

**Key patterns:**
- ✅ Use `<script setup lang="ts">`
- ✅ Define props and emits with TypeScript
- ✅ Keep components focused and under 300 LOC
- ✅ Use Vuetify components for UI
- ✅ Extract complex logic to composables

### Step 6: Create View

**Location:** `frontend/src/views/myFeature/MyFeatureView.vue`

**Pattern to follow:**
```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useMyFeatureStore } from '@/stores/myFeature';
import MyFeatureList from '@/components/domain/myFeature/MyFeatureList.vue';
import MyFeatureForm from '@/components/domain/myFeature/MyFeatureForm.vue';

const store = useMyFeatureStore();

onMounted(() => {
  store.fetchItems();
});

async function handleSubmit(data: MyFeatureRequest) {
  await store.performOperation(data);
}
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1>My Feature</h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="8">
        <MyFeatureList
          :items="store.items"
          :loading="store.loading"
        />
      </v-col>
      <v-col cols="12" md="4">
        <MyFeatureForm
          :loading="store.loading"
          @submit="handleSubmit"
        />
      </v-col>
    </v-row>
  </v-container>
</template>
```

**Key patterns:**
- ✅ Views are thin orchestrators
- ✅ Delegate logic to stores/composables
- ✅ Use domain components for UI
- ✅ File name: `*View.vue`

### Step 7: Add Route

**Location:** `frontend/src/router/index.ts`

**Add route:**
```typescript
{
  path: '/myfeature',
  name: 'myfeature',
  component: () => import('@/views/myFeature/MyFeatureView.vue'),
  meta: {
    requiresAuth: true,
    title: 'My Feature',
  },
}
```

---

## Testing Requirements

### Backend Tests

#### Unit Tests

**Location:** `functions/test/unit/services/MyFeatureService.unit.test.ts`

**What to test:**
- Service methods in isolation
- Error handling
- Edge cases
- Validation logic

**Pattern:**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MyFeatureService } from '../../../src/services/MyFeatureService';

describe('MyFeatureService', () => {
  let service: MyFeatureService;

  beforeEach(() => {
    service = new MyFeatureService();
  });

  it('should perform operation successfully', async () => {
    const result = await service.myFeatureOperation('user-123', {
      fieldName: 'test',
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('success');
  });

  it('should handle errors gracefully', async () => {
    await expect(
      service.myFeatureOperation('', { fieldName: '' })
    ).rejects.toThrow();
  });
});
```

#### Integration Tests

**Location:** `functions/test/integration/handlers/myFeatureHandler.test.ts`

**What to test:**
- Full request/response flow
- Authentication/authorization
- Validation
- Database interactions

**Pattern:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { myFeatureHandler } from '../../../src/handlers/myFeatureHandler';
import { createTestSuite } from '../../helpers';

describe('handlers/myFeatureHandler', () => {
  const suite = createTestSuite('handlers/myFeatureHandler');

  let mockReq: any;
  let mockRes: any;

  beforeEach(async () => {
    await suite.beforeEach();

    mockReq = {
      apiToken: {
        owner: 'test-user-123',
        permissions: ['WP'],
        gameMode: 'pvp',
      },
      body: { fieldName: 'test' },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('should handle valid request', async () => {
    await myFeatureHandler(mockReq, mockRes, vi.fn());

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.any(Object),
      })
    );
  });
});
```

**Run backend tests:**
```bash
npm run test:functions
npm run test:coverage:functions
```

### Frontend Tests

#### Component Tests

**Location:** `frontend/src/components/domain/myFeature/__tests__/MyFeatureCard.spec.ts`

**What to test:**
- Component rendering
- User interactions
- Props and emits
- Computed properties

**Pattern:**
```typescript
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MyFeatureCard from '../MyFeatureCard.vue';

describe('MyFeatureCard', () => {
  it('renders correctly', () => {
    const wrapper = mount(MyFeatureCard, {
      props: {
        item: {
          id: 'test-123',
          status: 'active',
          timestamp: 1234567890,
        },
      },
    });

    expect(wrapper.text()).toContain('test-123');
    expect(wrapper.text()).toContain('ACTIVE');
  });

  it('emits action event on button click', async () => {
    const wrapper = mount(MyFeatureCard, {
      props: {
        item: {
          id: 'test-123',
          status: 'active',
          timestamp: 1234567890,
        },
      },
    });

    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('action')).toBeTruthy();
  });
});
```

#### Store Tests

**Location:** `frontend/src/stores/__tests__/myFeature.spec.ts`

**What to test:**
- State initialization
- Actions
- Computed properties
- Integration with API

**Pattern:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMyFeatureStore } from '../myFeature';

describe('myFeatureStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with empty state', () => {
    const store = useMyFeatureStore();
    expect(store.items).toEqual([]);
    expect(store.hasItems).toBe(false);
  });

  it('adds items correctly', async () => {
    const store = useMyFeatureStore();
    await store.performOperation({ fieldName: 'test' });
    expect(store.hasItems).toBe(true);
  });
});
```

**Run frontend tests:**
```bash
npm run test:frontend
npm run test:coverage:frontend
```

### E2E Tests (Optional)

**Location:** `frontend/e2e/myFeature.spec.ts`

**When to add:**
- Critical user flows
- Complex interactions
- Cross-feature integration

**Pattern:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('MyFeature', () => {
  test('completes full user flow', async ({ page }) => {
    await page.goto('/myfeature');
    await page.fill('[data-test="field-name"]', 'test value');
    await page.click('[data-test="submit"]');
    await expect(page.locator('[data-test="result"]')).toBeVisible();
  });
});
```

**Run E2E tests:**
```bash
npm run test:e2e
```

---

## Documentation & Deployment

### Step 1: Verify OpenAPI Documentation

**View locally:**
```bash
npm run docs
# Opens Scalar UI at http://localhost:3000/api/docs
```

**Verify:**
- ✅ Endpoint appears in API documentation
- ✅ Request/response schemas are correct
- ✅ Authentication requirements are documented
- ✅ All parameters and fields have descriptions

### Step 2: Update Inline Documentation

**Add JSDoc comments to:**
- Service methods (purpose, parameters, return values)
- Complex helper functions
- Non-obvious business logic

**Don't over-document:**
- ❌ Skip trivial getters/setters
- ❌ Skip obvious utility functions
- ✅ Focus on "why" not "what"

### Step 3: Run Quality Gates

**Before committing:**
```bash
# Linting
npm run lint

# Formatting
npm run format:check

# All tests
npm run test

# Build
npm run build
```

**Fix any errors before proceeding.**

### Step 4: Test with Emulators

**Full integration test:**
```bash
npm run emulators
# Or for backend-only:
npm run emulators:backend
```

**Verify:**
- ✅ API endpoints respond correctly
- ✅ Authentication works
- ✅ Database operations succeed
- ✅ Error handling works

### Step 5: Commit Changes

**Commit message format:**
```
feat(myfeature): add new feature functionality

- Add MyFeatureService with operation methods
- Add handler with OpenAPI annotations
- Add frontend store and API integration
- Add comprehensive test coverage
```

**Include in commit:**
- ✅ Source code changes
- ✅ Test files
- ✅ Updated OpenAPI spec (`functions/openapi/openapi.json`)
- ✅ Type definitions

**Do NOT include:**
- ❌ Build artifacts (`functions/lib/`, `frontend/dist/`)
- ❌ Debug logs
- ❌ node_modules
- ❌ IDE-specific files

### Step 6: Deployment

**Staging deployment:**
```bash
npm run deploy:staging
```

**Production deployment:**
```bash
npm run deploy:prod
```

**Post-deployment verification:**
- ✅ Check Cloud Functions logs for errors
- ✅ Verify API endpoint in production
- ✅ Monitor for unusual error rates
- ✅ Test critical user flows

---

## Checklist Summary

Use this quick checklist when implementing a new feature:

### Backend
- [ ] Define types in `functions/src/types/`
- [ ] Create service class in `functions/src/services/`
- [ ] Create handler in `functions/src/handlers/`
- [ ] Add validation methods to `ValidationService`
- [ ] Export handler in `functions/src/handlers/index.ts`
- [ ] Wire routes in `functions/src/app/app.ts`
- [ ] Add OpenAPI annotations to handler
- [ ] Regenerate OpenAPI spec (`npm run docs:generate`)
- [ ] Write unit tests for service
- [ ] Write integration tests for handler
- [ ] Run quality gates (lint, test, build)

### Frontend
- [ ] Define types in `frontend/src/types/models/`
- [ ] Create API composable in `frontend/src/composables/api/`
- [ ] Create store if needed in `frontend/src/stores/`
- [ ] Create domain components in `frontend/src/components/domain/`
- [ ] Create view in `frontend/src/views/`
- [ ] Add route in `frontend/src/router/index.ts`
- [ ] Write component tests
- [ ] Write store tests if applicable
- [ ] Run quality gates (lint, test, build)

### Integration & Deployment
- [ ] Test with emulators (`npm run emulators`)
- [ ] Verify OpenAPI documentation
- [ ] Run full test suite (`npm run test`)
- [ ] Check test coverage
- [ ] Commit with conventional commit message
- [ ] Deploy to staging
- [ ] Verify in staging environment
- [ ] Deploy to production

---

## Tips & Best Practices

### Code Organization
- Keep files focused and under 300 LOC
- Separate concerns (service logic, validation, HTTP handling)
- Use barrel exports (`index.ts`) for clean imports
- Follow established naming conventions

### Error Handling
- Always wrap async operations in try-catch
- Use typed errors from `middleware/errorHandler`
- Log errors with context for debugging
- Return user-friendly error messages

### Performance
- Use lazy initialization for services
- Use Firestore transactions for multi-step writes
- Minimize Firestore reads with proper query design
- Consider caching for frequently accessed data

### Security
- Always validate user input
- Use proper authentication/authorization
- Never expose sensitive data in logs
- Follow principle of least privilege

### Testing
- Write tests before or alongside implementation
- Aim for meaningful coverage (not just high %)
- Test error paths and edge cases
- Use realistic test data

---

## Getting Help

**Documentation:**
- [AGENTS.md](../AGENTS.md) - AI agent guide and workflow tips
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and patterns
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflows
- [SECURITY.md](./SECURITY.md) - Security practices
- [frontend/src/STRUCTURE.md](../../frontend/src/STRUCTURE.md) - Frontend organization

**Code Examples:**
- Progress feature (most complete example)
- Team feature (demonstrates team operations)
- Token feature (demonstrates auth integration)

**When Stuck:**
- Search codebase with `grep` for similar patterns
- Review test files for usage examples
- Check existing handlers for OpenAPI annotation patterns
- Consult maintainer for architectural decisions
