# Token Inactivity-Based Expiration Implementation Guide

## TarkovTracker API Tokens

**Created:** 2025-10-15
**Priority:** P0
**Effort:** 6-8 hours
**Risk:** LOW

---

## Executive Summary

### Policy

**All API tokens automatically expire after 180 days of inactivity.**

- ✅ Active integrations never break (calls reset the timer)
- ✅ Abandoned tokens automatically cleanup
- ✅ Simple, predictable behavior
- ✅ No user configuration needed
- ✅ Easy to regenerate expired tokens

### Why This Approach?

**User Feedback:** "Users create API tokens, set them and forget them. If they no longer need them they can delete them."

**Solution:** Inactivity-based expiration is perfect for "set and forget" tokens because:

1. Active scripts/integrations keep working forever
1. Forgotten tokens don't accumulate security risk
1. Simple mental model: "use it or lose it"
1. Industry standard (GitHub, AWS, Google Cloud all use this)

---

## Implementation Overview

### Current State

```typescript
// Current ApiToken interface
interface ApiToken {
  owner: string;
  permissions: string[];
  gameMode: 'pvp' | 'pve' | 'dual';
  note: string;
  calls?: number;
  createdAt: Timestamp;
  // ❌ No lastUsed tracking
  // ❌ No revocation flag
  // ❌ No expiration logic
}
```

### Target State

```typescript
// New ApiToken interface
interface ApiToken {
  owner: string;
  permissions: string[];
  gameMode: 'pvp' | 'pve' | 'dual';
  note: string;
  calls: number;
  createdAt: Timestamp;
  lastUsed: Timestamp;    // ✅ NEW - Track last API call
  revoked: boolean;       // ✅ NEW - Explicit expiration flag
}
```

---

## Step 1: Update Type Definitions (15 min)

**File:** `functions/src/types/api.ts`

```typescript
// Add/update ApiToken interface
export interface ApiToken {
  owner: string;
  permissions: string[];
  gameMode: 'pvp' | 'pve' | 'dual';
  note: string;
  calls: number;
  createdAt: Timestamp;
  lastUsed: Timestamp;    // NEW
  revoked: boolean;       // NEW - false by default, true when expired/revoked
}

// Add constants
export const INACTIVITY_LIMIT_DAYS = 180;
export const EXPIRATION_WARNING_DAYS = 7; // Warn when < 7 days remaining
```

---

## Step 2: Update Middleware (30 min)

**File:** `functions/src/middleware/auth.ts`

### Current Implementation

```typescript
export const verifyBearer = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const tokenDoc = await db.collection('token').doc(token).get();

      if (!tokenDoc.exists()) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.apiToken = tokenDoc.data() as ApiToken;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
  }
);
```

### New Implementation

```typescript
import { INACTIVITY_LIMIT_DAYS } from '../types/api.js';

export const verifyBearer = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const tokenDoc = await db.collection('token').doc(token).get();

      if (!tokenDoc.exists()) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const tokenData = tokenDoc.data() as ApiToken;

      // ✅ NEW: Check if token is revoked
      if (tokenData.revoked) {
        return res.status(401).json({
          error: 'Token has been revoked',
          code: 'TOKEN_REVOKED'
        });
      }

      // ✅ NEW: Check inactivity-based expiration
      if (tokenData.lastUsed) {
        const daysSinceLastUse =
          (Date.now() - tokenData.lastUsed.toMillis()) / (1000 * 60 * 60 * 24);

        if (daysSinceLastUse > INACTIVITY_LIMIT_DAYS) {
          // Auto-revoke expired token (non-blocking fire-and-forget)
          tokenDoc.ref.update({ revoked: true }).catch(err => {
            logger.error('Failed to revoke inactive token', { error: err });
          });

          logger.warn('Token expired due to inactivity', {
            owner: tokenData.owner,
            daysSinceLastUse: Math.floor(daysSinceLastUse),
          });

          return res.status(401).json({
            error: 'Token expired due to inactivity',
            details: `Token was inactive for ${Math.floor(daysSinceLastUse)} days`,
            code: 'TOKEN_EXPIRED_INACTIVE',
            inactiveDays: Math.floor(daysSinceLastUse),
            expirationPolicy: `Tokens expire after ${INACTIVITY_LIMIT_DAYS} days of inactivity`
          });
        }
      }

      // ✅ NEW: Update last used timestamp (fire-and-forget to avoid blocking)
      tokenDoc.ref.update({
        lastUsed: Timestamp.now(),
        calls: FieldValue.increment(1),
      }).catch(err => {
        // Log but don't fail the request
        logger.error('Failed to update token usage', { error: err });
      });

      req.apiToken = tokenData;
      next();
    } catch (error) {
      logger.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  }
);
```

---

## Step 3: Update TokenService (30 min)

**File:** `functions/src/services/TokenService.ts`

### Update createToken Method

```typescript
async createToken(
  userId: string,
  data: {
    note: string;
    permissions: string[];
    gameMode?: 'pvp' | 'pve' | 'dual';
  }
): Promise<{ tokenId: string; token: string }> {
  // Generate unique token
  const tokenId = await this.generateUniqueToken();

  const tokenData: ApiToken = {
    owner: userId,
    note: data.note,
    permissions: data.permissions,
    gameMode: data.gameMode || 'dual',
    calls: 0,
    createdAt: Timestamp.now(),
    lastUsed: Timestamp.now(),  // ✅ NEW - Initialize with creation time
    revoked: false,             // ✅ NEW - Default to active
  };

  await db.collection('token').doc(tokenId).set(tokenData);

  logger.info('API token created', {
    owner: userId,
    permissions: data.permissions,
    gameMode: tokenData.gameMode,
  });

  return { tokenId, token: tokenId };
}
```

### Add regenerateToken Method

```typescript
/**
 * Regenerate an existing token with same settings
 * Useful when token expires due to inactivity
 */
async regenerateToken(
  userId: string,
  oldTokenId: string
): Promise<{ tokenId: string; token: string }> {
  // Get old token
  const oldTokenDoc = await db.collection('token').doc(oldTokenId).get();

  if (!oldTokenDoc.exists()) {
    throw new Error('Token not found');
  }

  const oldToken = oldTokenDoc.data() as ApiToken;

  if (oldToken.owner !== userId) {
    throw new Error('Unauthorized');
  }

  // Create new token with same settings
  const newTokenId = await this.generateUniqueToken();

  const newTokenData: ApiToken = {
    owner: userId,
    note: oldToken.note,
    permissions: oldToken.permissions,
    gameMode: oldToken.gameMode,
    calls: 0,
    createdAt: Timestamp.now(),
    lastUsed: Timestamp.now(),
    revoked: false,
  };

  await db.runTransaction(async (transaction) => {
    // Revoke old token
    transaction.update(oldTokenDoc.ref, { revoked: true });

    // Create new token
    transaction.set(db.collection('token').doc(newTokenId), newTokenData);
  });

  logger.info('API token regenerated', {
    owner: userId,
    oldToken: oldTokenId,
    newToken: newTokenId,
  });

  return { tokenId: newTokenId, token: newTokenId };
}
```

---

## Step 4: Update Frontend UI (2-3 hours)

**File:** `frontend/src/features/settings/ApiTokens.vue`

### Add Computed Properties

```vue
<script setup lang="ts">
import { computed } from 'vue';
import type { ApiToken } from '@/types/api';

interface Props {
  token: ApiToken;
}

const props = defineProps<Props>();

const daysSinceLastUse = computed(() => {
  if (!props.token.lastUsed) return Infinity;
  const ms = Date.now() - props.token.lastUsed.toMillis();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
});

const daysUntilExpiration = computed(() => {
  const INACTIVITY_LIMIT_DAYS = 180;
  return INACTIVITY_LIMIT_DAYS - daysSinceLastUse.value;
});

const isExpired = computed(() => {
  return props.token.revoked || daysUntilExpiration.value <= 0;
});

const showExpirationWarning = computed(() => {
  return !isExpired.value && daysUntilExpiration.value <= 7;
});

const formatLastUsed = (timestamp: Timestamp | null) => {
  if (!timestamp) return 'Never';

  const days = daysSinceLastUse.value;
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};
</script>
```

### Update Template

```vue
<template>
  <v-card :class="{ 'token-expired': isExpired }">
    <v-card-title class="d-flex align-center">
      <span>{{ token.note }}</span>
      <v-chip
        v-if="isExpired"
        size="small"
        color="error"
        class="ml-2"
      >
        Expired
      </v-chip>
    </v-card-title>

    <v-card-text>
      <v-list density="compact">
        <v-list-item>
          <v-list-item-title>Created</v-list-item-title>
          <v-list-item-subtitle>{{ formatDate(token.createdAt) }}</v-list-item-subtitle>
        </v-list-item>

        <v-list-item>
          <v-list-item-title>Last used</v-list-item-title>
          <v-list-item-subtitle>{{ formatLastUsed(token.lastUsed) }}</v-list-item-subtitle>
        </v-list-item>

        <v-list-item>
          <v-list-item-title>API calls</v-list-item-title>
          <v-list-item-subtitle>{{ token.calls.toLocaleString() }}</v-list-item-subtitle>
        </v-list-item>

        <v-list-item>
          <v-list-item-title>Permissions</v-list-item-title>
          <v-list-item-subtitle>{{ token.permissions.join(', ') }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>

      <!-- Expiration warning -->
      <v-alert
        v-if="showExpirationWarning"
        type="warning"
        density="compact"
        class="mt-3"
      >
        ⚠️ Will expire in {{ daysUntilExpiration }} days if not used
      </v-alert>

      <!-- Expired message -->
      <v-alert
        v-else-if="isExpired"
        type="error"
        density="compact"
        class="mt-3"
      >
        ❌ Expired due to {{ daysSinceLastUse }} days of inactivity
      </v-alert>

      <!-- Inactivity info -->
      <v-alert
        v-else-if="daysSinceLastUse > 90"
        type="info"
        density="compact"
        class="mt-3"
      >
        ℹ️ Token will expire after 180 days of inactivity
        ({{ daysUntilExpiration }} days remaining)
      </v-alert>
    </v-card-text>

    <v-card-actions>
      <v-btn
        @click="emit('regenerate', token)"
        :disabled="!isExpired"
        variant="outlined"
      >
        Regenerate
      </v-btn>
      <v-btn
        @click="emit('revoke', token)"
        color="error"
        :disabled="isExpired"
        variant="outlined"
      >
        Revoke
      </v-btn>
      <v-spacer />
      <v-btn
        v-if="!isExpired"
        @click="emit('copy', token)"
        icon="mdi-content-copy"
        variant="text"
      />
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.token-expired {
  opacity: 0.7;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(255, 0, 0, 0.05) 10px,
    rgba(255, 0, 0, 0.05) 20px
  );
}
</style>
```

---

## Step 5: Add Regenerate Handler (30 min)

**File:** `frontend/src/features/settings/ApiTokens.vue` (parent component)

```typescript
const regenerateToken = async (token: ApiToken) => {
  try {
    loading.value = true;

    // Call regenerate endpoint
    const result = await httpsCallable(functions, 'regenerateToken')({
      tokenId: token.id,
    });

    // Show new token to user
    newTokenValue.value = result.data.token;
    showNewTokenDialog.value = true;

    // Refresh token list
    await fetchTokens();

    // Success notification
    snackbar.show({
      text: 'Token regenerated successfully!',
      color: 'success',
    });
  } catch (error) {
    snackbar.show({
      text: `Failed to regenerate token: ${error.message}`,
      color: 'error',
    });
  } finally {
    loading.value = false;
  }
};
```

---

## Step 6: Backend Regenerate Endpoint (30 min)

**File:** `functions/src/handlers/tokenHandler.ts`

```typescript
import { abuseGuard } from '../middleware/abuseGuard.js';

export const regenerateTokenHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.uid;
    const { tokenId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Early validation: tokenId required
    if (!tokenId) {
      return res.status(400).json({ error: 'Token ID required' });
    }

    // Early validation: tokenId format check (alphanumeric, 20-40 chars)
    if (!/^[a-zA-Z0-9]{20,40}$/.test(tokenId)) {
      logger.warn('Invalid token ID format in regenerate request', {
        userId,
        tokenId: tokenId.substring(0, 10) + '...',
      });
      return res.status(400).json({ 
        error: 'Invalid token ID format',
        code: 'INVALID_TOKEN_FORMAT' 
      });
    }

    try {
      // Pre-check: Verify token exists and belongs to user
      const tokenDoc = await db.collection('token').doc(tokenId).get();

      if (!tokenDoc.exists()) {
        logger.warn('Token not found in regenerate request', { userId, tokenId });
        return res.status(404).json({
          error: 'Token not found',
          code: 'TOKEN_NOT_FOUND'
        });
      }

      const tokenData = tokenDoc.data() as ApiToken;

      if (tokenData.owner !== userId) {
        logger.warn('Unauthorized token regeneration attempt', {
          userId,
          tokenId,
          tokenOwner: tokenData.owner,
        });
        return res.status(403).json({
          error: 'You do not own this token',
          code: 'TOKEN_NOT_OWNED'
        });
      }

      // Now call the service to regenerate
      const tokenService = new TokenService();
      const result = await tokenService.regenerateToken(userId, tokenId);

      res.status(200).json({
        success: true,
        token: result.token,
        tokenId: result.tokenId,
      });
    } catch (error) {
      logger.error('Token regeneration failed', { error, userId, tokenId });
      
      // Don't leak internal errors to client
      res.status(500).json({ 
        error: 'Failed to regenerate token',
        code: 'REGENERATION_FAILED'
      });
    }
  }
);
```

**Add rate-limited route in `functions/src/index.ts`:**

```typescript
import { abuseGuard } from '../middleware/abuseGuard.js';

// Apply the standard abuseGuard middleware to the route
// abuseGuard handles rate limiting with configurable thresholds via environment variables
app.post('/api/tokens/regenerate',
  requireAuth,
  abuseGuard,
  tokenHandler.regenerateTokenHandler
);
```

**Note about rate limiting**:

TarkovTracker uses the standard [`abuseGuard`](functions/src/middleware/abuseGuard.ts:67) middleware for rate-limiting across all API endpoints. This middleware is already applied globally to all `/api/*` routes in [`app.use('/api', abuseGuard);`](functions/src/app/app.ts:78) and provides configurable rate-limiting via environment variables.

The [`abuseGuard`](functions/src/middleware/abuseGuard.ts:67) middleware handles:
- Rate-limiting per token/IP with configurable thresholds
- Warning at 80% of threshold
- Blocking after consecutive breaches
- Event logging to Firestore for monitoring


No additional rate limiter implementation is needed for the regenerate token endpoint.

---

## Required Composite Indexes

**⚠️ CRITICAL: Firestore composite indexes are required for efficient token and rate limiting queries.**

The token inactivity expiration system requires the following composite indexes for optimal performance:

### Current Status

The current `firestore.indexes.json` file is empty, but the following indexes are recommended for production deployments:

### Token Collection Indexes

```json
{
  "collectionGroup": "token",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "owner", "order": "ASCENDING" },
    { "fieldPath": "revoked", "order": "ASCENDING" }
  ]
}
```


- **Purpose**: Efficiently query active tokens by owner for regeneration operations
- **Usage**: `token.where('owner', '==', userId).where('revoked', '==', false)`

```json
{
  "collectionGroup": "token", 
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "revoked", "order": "ASCENDING" },
    { "fieldPath": "lastUsed", "order": "ASCENDING" }
  ]
}
```

- **Purpose**: Find tokens that need expiration processing
- **Usage**: `token.where('revoked', '==', false).where('lastUsed', '<=', cutoffDate)`

### Rate Limit Events Indexes  

```json
{
  "collectionGroup": "rateLimitEvents",
  "queryScope": "COLLECTION", 
  "fields": [
    { "fieldPath": "cacheKey", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```


- **Purpose**: Monitor abuse guard events by cache key for security analysis
- **Usage**: `rateLimitEvents.where('cacheKey', '==', tokenKey).orderBy('createdAt', 'desc')`

### Deployment Commands

Deploy indexes using Firebase CLI:

```bash
firebase deploy --only firestore:indexes
```

### Validation

- **CI/CD**: Automated testing in emulator mode validates index usage
- **Local Development**: Use `firebase emulators:start` to test index requirements  
- **Production Monitoring**: Monitor Firestore query performance in Google Cloud Console

For the complete index definitions, refer to [`firestore.indexes.json`](firestore.indexes.json) in the project root.

---
No additional rate limiter implementation is needed for the regenerate token endpoint.

---

### Redis Alternative

For high-throughput scenarios, Redis provides a low-latency alternative with single source of truth across instances:

- Use `INCR` with `EXPIRE` for fixed-window, or `ZADD`/`ZREMRANGEBYSCORE` for sliding window
- Store keys by the same scheme (ip/uid + route)
- Keep TTL aligned with `windowMs`
- Ensure retry headers mirror Firestore approach

---

## Step 7: Migration for Existing Tokens (**REQUIRED**, 30 min)

**⚠️ CRITICAL: This migration is REQUIRED for any project with pre-existing tokens.**

Run this migration **BEFORE** deploying the new middleware code to eliminate any window where tokens lack `lastUsed`/`revoked` fields and could cause runtime failures.

**File:** `functions/src/migrations/addTokenInactivityTracking.ts`

```typescript
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase.js';
import { logger } from '../utils/logger.js';

/**
 * Migration: Add lastUsed and revoked fields to existing tokens
 * Run once after deploying new feature
 */
export async function migrateExistingTokens() {
  logger.info('Starting token migration: adding inactivity tracking');

  const tokensSnapshot = await db.collection('token').get();

  if (tokensSnapshot.empty) {
    logger.info('No tokens to migrate');
    return;
  }

  const batch = db.batch();
  let count = 0;

  for (const tokenDoc of tokensSnapshot.docs) {
    const data = tokenDoc.data();

    // Add default fields for existing tokens
    const updates: any = {
      revoked: false,
    };

    // Initialize lastUsed with createdAt or current time
    if (!data.lastUsed) {
      updates.lastUsed = data.createdAt || Timestamp.now();
    }

    // Ensure calls field exists
    if (data.calls === undefined) {
      updates.calls = 0;
    }

    batch.update(tokenDoc.ref, updates);
    count++;

    // Firestore batch limit is 500
    if (count % 500 === 0) {
      await batch.commit();
      logger.info(`Migrated ${count} tokens so far...`);
    }
  }

  await batch.commit();

  logger.info(`Token migration complete: migrated ${count} tokens`);
}
```

**Run migration:**

```typescript
// Add to functions/src/index.ts (or run via admin script)
export const migrateTokens = onRequest({ memory: '512MiB' }, async (req, res) => {
  try {
    await migrateExistingTokens();
    res.status(200).json({ success: true, message: 'Migration complete' });
  } catch (error) {
    logger.error('Migration failed', { error });
    res.status(500).json({ error: 'Migration failed' });
  }
});
```

**Migration Deployment Steps:**

1. **Deploy migration function first:**

   ```bash
   npm run deploy:functions
   ```

2. **Run migration:**

   ```bash
   curl -X POST https://your-project.cloudfunctions.net/migrateTokens
   ```

3. **Verify completion** in logs/response

4. **Then deploy the new middleware code** that requires `lastUsed`/`revoked` fields

**Idempotency:** This migration is safe to re-run multiple times. It only updates tokens that lack the required fields.

**Firestore Index Requirements:**

Before deploying, ensure these indexes exist:

1. **Single-field index on `lastUsed`** (for range queries like `where('lastUsed', '<', ...)`)
   - Usually auto-created by Firestore
   - Verify in Firebase Console → Firestore → Indexes → Single field

2. **Composite indexes** (if using queries that combine fields):
   - `revoked` + `lastUsed` - Required for email notification queries
   - Add to `firestore.indexes.json` and deploy with `firebase deploy --only firestore:indexes`

**Note:** The migration sets `lastUsed` to `createdAt` (or current time) for existing tokens, giving them a full 180-day grace period from the migration date.

---

## Testing Checklist

### Unit Tests

- [ ] TokenService.createToken() initializes lastUsed
- [ ] TokenService.regenerateToken() creates new token and revokes old
- [ ] verifyBearer checks revoked flag
- [ ] verifyBearer calculates daysSinceLastUse correctly
- [ ] verifyBearer auto-revokes tokens > 180 days inactive

### Integration Tests

- [ ] Create token and verify API calls work
- [ ] Verify lastUsed updates on each API call
- [ ] Mock 181-day-old token and verify it gets rejected
- [ ] Verify expired token returns correct error code
- [ ] Regenerate expired token and verify new token works
- [ ] Revoke token and verify it stops working

### Performance Tests

- [ ] **Measure lastUsed update latency impact:**
  - Baseline: Average API request time without lastUsed updates
  - With feature: Average API request time with fire-and-forget lastUsed updates
  - Pass criteria: < 5ms latency increase, no blocking on update failures
  
- [ ] **Validate migration throughput on large datasets:**
  - Test with simulated 100K+ token dataset
  - Measure total migration time (should complete in < 30 minutes)
  - Verify batching works correctly (500 tokens per batch)
  - Confirm no memory issues or timeouts

### Rollback Tests

- [ ] **Previous middleware handles new fields:**
  - Deploy tokens with `lastUsed` and `revoked` fields
  - Roll back to previous middleware version (without inactivity checks)
  - Verify tokens with new fields still work correctly
  - Confirm rollback doesn't reject or corrupt existing tokens
  
- [ ] **Rollback procedure validation:**
  - Document exact rollback steps (git checkout, redeploy)
  - Test rollback in staging environment
  - Verify data integrity after rollback (no token corruption)
  - Confirm users can still authenticate with existing tokens

### Manual Testing

- [ ] Create new token in UI
- [ ] Verify "Last used" displays correctly
- [ ] Make API call and verify "Last used" updates
- [ ] Mock expired token (change lastUsed in Firestore)
- [ ] Verify expiration warning appears when < 7 days remaining
- [ ] Verify "Expired" badge appears for revoked tokens
- [ ] Click "Regenerate" and verify new token is created
- [ ] Verify old token no longer works after regeneration

---

## Timeline

**Total Estimated Time:** 6-8 hours

| Step | Task | Time |
|------|------|------|
| 1 | Update type definitions | 15 min |
| 2 | Update middleware (auth.ts) | 30 min |
| 3 | Update TokenService | 30 min |
| 4 | Update Frontend UI | 2-3 hours |
| 5 | Add regenerate handler | 30 min |
| 6 | Backend regenerate endpoint | 30 min |
| 7 | Migration (optional) | 30 min |
| Testing | Unit + integration + manual | 2 hours |

---

## Rollback Plan

If issues arise:

```bash
# 1. Revert middleware changes
git checkout functions/src/middleware/auth.ts

# 2. Revert TokenService changes
git checkout functions/src/services/TokenService.ts

# 3. Redeploy functions
npm run deploy:functions

# 4. No data loss - tokens still work with old code
```

---

## Success Criteria

✅ All existing tokens continue to work
✅ New tokens have lastUsed tracking
✅ Tokens > 180 days inactive get auto-revoked
✅ UI shows "Last used" and expiration warnings
✅ Users can regenerate expired tokens
✅ No performance degradation

---

## Future Enhancements (Optional)

### Email Notifications

Send email when token is about to expire:

```typescript
// Run daily via Cloud Scheduler
export const notifyExpiringTokens = onSchedule({
  schedule: 'every day 09:00',
}, async () => {
  const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const tokensSnapshot = await db.collection('token')
    .where('revoked', '==', false)
    .where('lastUsed', '<', sevenDaysAgo)
    .get();

  for (const tokenDoc of tokensSnapshot.docs) {
    // Send email notification
  }
});
```

### ⚠️ Important: Composite Index Required

This query combines `where('revoked', '==', false)` and `where('lastUsed', '<', ...)` which requires a composite index in Firestore. Before deploying this function:

1. **Create the index via Firebase Console:**
   - Navigate to Firestore → Indexes → Composite
   - Add index for collection `token`:
     - Field: `revoked` (Ascending)
     - Field: `lastUsed` (Ascending)
     - Query scope: Collection

2. **Or use Firebase CLI:** Add to `firestore.indexes.json`:

   ```json
   {
     "collectionGroup": "token",
     "queryScope": "COLLECTION",
     "fields": [
       { "fieldPath": "revoked", "order": "ASCENDING" },
       { "fieldPath": "lastUsed", "order": "ASCENDING" }
     ]
   }
   ```

   Then deploy: `firebase deploy --only firestore:indexes`

3. **Or wait for auto-creation:** Run the function once and it will provide a link to auto-create the index (takes 5-15 minutes).

Without this index, the query will fail at runtime with an error like "The query requires an index."

### Analytics Dashboard

Track token usage patterns:

- Average token lifespan
- Number of expired tokens
- Most active tokens
- Unused tokens

---

**Document Version:** 1.0
**Created:** 2025-10-15
**Status:** Ready for Implementation
