# Team Composables Developer Guide

Quick reference for using the new team management composables.

## useTeamManagement

Handles team creation, leaving/disbanding, and notifications.

### Import
```typescript
import { useTeamManagement } from '@/composables/team/useTeamManagement';
```

### Basic Usage
```typescript
const {
  loading,
  notification,
  showNotification,
  handleCreateTeam,
  handleLeaveTeam,
  isTeamOwner
} = useTeamManagement();
```

### In Template
```vue
<template>
  <!-- Create Team Button -->
  <v-btn
    :disabled="loading.createTeam"
    :loading="loading.createTeam"
    @click="handleCreateTeam"
  >
    Create Team
  </v-btn>

  <!-- Leave Team Button -->
  <v-btn
    :disabled="loading.leaveTeam"
    :loading="loading.leaveTeam"
    @click="handleLeaveTeam"
  >
    {{ isTeamOwner ? 'Disband Team' : 'Leave Team' }}
  </v-btn>

  <!-- Notification Display -->
  <notification-snackbar v-model="notification" />
</template>
```

### API Reference

#### Functions
- **`handleCreateTeam()`**: Creates a new team
  - Sets display name to random value if user is owner
  - Shows success/error notification
  - Waits for store updates

- **`handleLeaveTeam()`**: Leaves or disbands team
  - Resets display name if it starts with "User "
  - Shows success/error notification

- **`showNotification(message, color)`**: Display user feedback
  - `message`: String to display
  - `color`: Vuetify color (default: 'accent')

#### State
- **`loading`**: `{ createTeam: boolean, leaveTeam: boolean }`
- **`notification`**: `{ show: boolean, message: string, color: string }`
- **`isTeamOwner`**: Computed boolean - true if user owns team

### Example: Custom Team Operations Component
```typescript
<script setup>
import { useTeamManagement } from '@/composables/team/useTeamManagement';

const { handleCreateTeam, loading } = useTeamManagement();

const createTeamWithCustomName = async () => {
  await handleCreateTeam();
  // Additional custom logic after team creation
};
</script>

<template>
  <v-btn
    :loading="loading.createTeam"
    @click="createTeamWithCustomName"
  >
    Create My Team
  </v-btn>
</template>
```

---

## useTeamUrl

Generates and manages team invite URLs with clipboard operations.

### Import
```typescript
import { useTeamUrl } from '@/composables/team/useTeamUrl';
```

### Basic Usage
```typescript
const {
  teamUrl,
  visibleUrl,
  copyUrl
} = useTeamUrl();
```

### In Template
```vue
<template>
  <!-- Display URL with Streamer Mode Support -->
  <v-text-field
    :model-value="visibleUrl"
    label="Team Invite URL"
    readonly
  />

  <!-- Copy Button -->
  <v-btn @click="handleCopyUrl">
    Copy URL
  </v-btn>
</template>

<script setup>
import { useTeamUrl } from '@/composables/team/useTeamUrl';

const { copyUrl, visibleUrl } = useTeamUrl();

const handleCopyUrl = async () => {
  const success = await copyUrl();
  if (success) {
    showNotification('URL copied!');
  } else {
    showNotification('Failed to copy', 'error');
  }
};
</script>
```

### API Reference

#### Functions
- **`copyUrl()`**: Async function to copy URL to clipboard
  - Returns: `Promise<boolean>` (true if successful)
  - No throw errors, returns boolean for control flow

#### Computed Properties
- **`teamUrl`**: Full URL string
  - Format: `{baseUrl}?team={teamId}&code={password}`
  - Empty string if team/password not available

- **`visibleUrl`**: Display-friendly URL
  - Shows URL normally
  - Shows "URL hidden" text if streamer mode enabled
  - Uses i18n for the hidden text

### Example: Advanced URL Sharing
```typescript
<script setup>
import { useTeamUrl } from '@/composables/team/useTeamUrl';

const { teamUrl, copyUrl } = useTeamUrl();

const shareUrl = async () => {
  if (navigator.share) {
    // Native share on mobile
    await navigator.share({
      title: 'Join my Tarkov Tracker team',
      url: teamUrl.value
    });
  } else {
    // Fallback to clipboard
    await copyUrl();
  }
};
</script>
```

---

## useTeamInvite

Handles team invitation acceptance from URL parameters.

### Import
```typescript
import { useTeamInvite } from '@/composables/team/useTeamInvite';
```

### Basic Usage
```typescript
const {
  hasInviteInUrl,
  inInviteTeam,
  accepting,
  joinTeamSnackbar,
  joinResult,
  declined,
  acceptInvite,
  declineInvite
} = useTeamInvite();
```

### In Template
```vue
<template>
  <!-- Show Invite Alert -->
  <v-alert
    v-if="hasInviteInUrl && !inInviteTeam && !declined"
    color="green"
    icon="mdi-handshake"
  >
    <div class="d-flex justify-space-between">
      <div>You've been invited to join a team!</div>
      <div>
        <v-btn
          :loading="accepting"
          @click="acceptInvite"
        >
          Accept
        </v-btn>
        <v-btn
          :disabled="accepting"
          @click="declineInvite"
        >
          Decline
        </v-btn>
      </div>
    </div>
  </v-alert>

  <!-- Result Snackbar -->
  <v-snackbar v-model="joinTeamSnackbar" :timeout="4000">
    {{ joinResult }}
  </v-snackbar>
</template>
```

### API Reference

#### Functions
- **`acceptInvite()`**: Accept team invitation from URL
  - Checks if user already in team
  - Leaves previous team if needed
  - Shows result snackbar on completion

- **`declineInvite()`**: Mark invitation as declined
  - Sets `declined` to true, hiding the alert

#### State
- **`accepting`**: Boolean - true while invitation is being processed
- **`joinTeamSnackbar`**: Boolean - controls snackbar visibility
- **`joinResult`**: String - result message to display
- **`declined`**: Boolean - true if user declined the invite

#### Computed Properties
- **`hasInviteInUrl`**: Boolean - checks for `team` and `code` URL params
- **`inInviteTeam`**: Boolean - true if user already in the invited team

### Example: Team Invitation Flow
```typescript
<script setup>
import { useTeamInvite } from '@/composables/team/useTeamInvite';

const invite = useTeamInvite();

// Auto-accept for deep links
onMounted(() => {
  if (invite.hasInviteInUrl.value && !invite.inInviteTeam.value) {
    // Could automatically accept or show confirmation
    console.log('Team invitation available');
  }
});

// Handle decline with custom logic
const handleDecline = () => {
  invite.declineInvite();
  // Additional decline tracking/logging
};
</script>
```

---

## Combining Composables

### Example: Complete Team Management Component

```vue
<script setup>
import { computed } from 'vue';
import { useTeamManagement } from '@/composables/team/useTeamManagement';
import { useTeamUrl } from '@/composables/team/useTeamUrl';
import { useLiveData } from '@/composables/livedata';

const { useSystemStore } = useLiveData();
const { systemStore } = useSystemStore();

// Team operations
const teamOps = useTeamManagement();

// URL management
const teamUrlOps = useTeamUrl();

// Local UI state
const hasTeam = computed(() => !!systemStore.$state.team);

// Combined copy handler
const handleCopyUrl = async () => {
  const success = await teamUrlOps.copyUrl();
  teamOps.showNotification(
    success ? 'URL copied!' : 'Failed to copy',
    success ? 'success' : 'error'
  );
};
</script>

<template>
  <v-card>
    <v-card-title>Team Management</v-card-title>

    <v-card-text>
      <div v-if="!hasTeam" class="text-center py-4">
        No team yet
      </div>
      <div v-else>
        <v-text-field
          :model-value="teamUrlOps.visibleUrl"
          label="Invite URL"
          readonly
        />
      </div>
    </v-card-text>

    <v-card-actions>
      <v-btn
        v-if="!hasTeam"
        :loading="teamOps.loading.createTeam"
        @click="teamOps.handleCreateTeam"
      >
        Create Team
      </v-btn>
      <v-btn
        v-else
        :loading="teamOps.loading.leaveTeam"
        @click="teamOps.handleLeaveTeam"
      >
        {{ teamOps.isTeamOwner ? 'Disband' : 'Leave' }}
      </v-btn>
      <v-btn
        v-if="hasTeam"
        @click="handleCopyUrl"
      >
        Copy URL
      </v-btn>
    </v-card-actions>

    <notification-snackbar v-model="teamOps.notification" />
  </v-card>
</template>
```

---

## Testing Composables

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTeamManagement } from '@/composables/team/useTeamManagement';

describe('useTeamManagement', () => {
  beforeEach(() => {
    // Setup test environment
    vi.clearAllMocks();
  });

  it('should initialize with correct state', () => {
    const { loading, notification } = useTeamManagement();
    expect(loading.createTeam).toBe(false);
    expect(loading.leaveTeam).toBe(false);
    expect(notification.show).toBe(false);
  });

  it('should show notification when requested', () => {
    const { showNotification, notification } = useTeamManagement();
    showNotification('Test message', 'success');
    expect(notification.message).toBe('Test message');
    expect(notification.color).toBe('success');
  });

  it('should check team ownership correctly', () => {
    const { isTeamOwner } = useTeamManagement();
    // Mock store data and verify ownership logic
    // Details depend on your test setup
  });
});
```

---

## Best Practices

✅ **Do**:
- Import only what you need from composables
- Use computed properties for reactive values
- Combine multiple composables for complex features
- Handle async operations with proper loading states
- Show user feedback via notifications

❌ **Don't**:
- Store composable return values outside components
- Mutate store state directly (use composable methods)
- Mix UI logic with business logic in components
- Create tight coupling between components
- Forget to handle errors in async operations

---

## Common Patterns

### Pattern: Loading + Notification
```typescript
<script setup>
import { useTeamManagement } from '@/composables/team/useTeamManagement';

const { handleCreateTeam, loading } = useTeamManagement();

const create = async () => {
  // Loading state auto-managed by composable
  await handleCreateTeam();
  // Notification auto-shown by composable
};
</script>
```

### Pattern: Conditional Display
```typescript
<script setup>
import { computed } from 'vue';
import { useTeamInvite } from '@/composables/team/useTeamInvite';

const { hasInviteInUrl, inInviteTeam, declined } = useTeamInvite();

const showInvite = computed(
  () => hasInviteInUrl.value && !inInviteTeam.value && !declined.value
);
</script>

<template>
  <v-alert v-if="showInvite">
    <!-- Invite UI -->
  </v-alert>
</template>
```

### Pattern: Async Copy with Feedback
```typescript
<script setup>
import { useTeamUrl } from '@/composables/team/useTeamUrl';
import { useTeamManagement } from '@/composables/team/useTeamManagement';

const { copyUrl } = useTeamUrl();
const { showNotification } = useTeamManagement();

const copyWithFeedback = async () => {
  const success = await copyUrl();
  showNotification(
    success ? 'Copied to clipboard!' : 'Copy failed',
    success ? 'success' : 'error'
  );
};
</script>
```

---

## Troubleshooting

### Issue: Notification not showing
**Solution**: Ensure you're using the `showNotification()` method from `useTeamManagement`.

### Issue: URL not generated
**Solution**: Verify that `teamStore.password` and `systemStore.team` are populated.

### Issue: Invite not detected
**Solution**: Check that URL has both `team` and `code` query parameters.

### Issue: Team operation fails
**Solution**: Check browser console for specific error message, ensure user is authenticated.

---

For more details, see `TEAM_ARCHITECTURE.md` for system design and data flow diagrams.
