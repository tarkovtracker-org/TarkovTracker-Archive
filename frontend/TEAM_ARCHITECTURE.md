# Team Management Architecture

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        TeamView.vue                              │
│                    (Orchestrator/Router)                         │
│  - Routes to team management sub-components                      │
│  - No business logic, purely composition                          │
└────────────────┬─────────────────────────────────────────────────┘
                 │
        ┌────────┼────────┬─────────┬───────┐
        │        │        │         │       │
        ▼        ▼        ▼         ▼       ▼
    ┌───────┐ ┌────────┐ ┌────────┐ ┌──────┐ ┌──────────┐
    │MyTeam │ │Team    │ │Team    │ │Team  │ │Teammate │
    │.vue   │ │Members │ │Invite  │ │Options│ │Card.vue │
    │       │ │.vue    │ │.vue    │ │.vue  │ │         │
    └───┬───┘ └──┬────┘ └──┬─────┘ └──────┘ └─────────┘
        │        │         │
        │        └─────────┴───────┬──────────────────────┐
        │                          │                      │
        │        ┌─────────────────▼─────────────────────┐│
        │        │ Pinia Stores                          ││
        │        │ - useTeamStore                        ││
        │        │ - useSystemStore                      ││
        │        │ - useTarkovStore                      ││
        │        │ - useUserStore                        ││
        │        └──────────────────────────────────────┘│
        │                                                 │
        │ ┌──────────────────────────────────────────────┘
        │ │
        │ ▼
    ╔═══════════════════════════════════════════════════╗
    ║         BUSINESS LOGIC COMPOSABLES                ║
    ║     (frontend/src/composables/team/)              ║
    ╠═══════════════════════════════════════════════════╣
    ║                                                   ║
    ║  📋 useTeamManagement.ts                          ║
    ║  ├─ handleCreateTeam()                           ║
    ║  ├─ handleLeaveTeam()                            ║
    ║  ├─ showNotification()                           ║
    ║  ├─ isTeamOwner (computed)                       ║
    ║  └─ loading & notification state                 ║
    ║                                                   ║
    ║  🔗 useTeamUrl.ts                                ║
    ║  ├─ copyUrl()                                    ║
    ║  ├─ teamUrl (computed)                           ║
    ║  └─ visibleUrl (computed - streamer mode aware)  ║
    ║                                                   ║
    ║  ✋ useTeamInvite.ts                             ║
    ║  ├─ acceptInvite()                               ║
    ║  ├─ declineInvite()                              ║
    ║  ├─ hasInviteInUrl (computed)                    ║
    ║  ├─ inInviteTeam (computed)                      ║
    ║  └─ joinResult & joinTeamSnackbar                ║
    ║                                                   ║
    ╚═══════════════════════════════════════════════════╝
                      │
                      │ (Firebase calls, store updates)
                      │
                      ▼
    ┌─────────────────────────────────────┐
    │       Firebase Backend              │
    │  - Cloud Functions (team ops)       │
    │  - Firestore (team data)            │
    │  - Authentication                   │
    └─────────────────────────────────────┘
```

## Data Flow

### Creating a Team

```
MyTeam.vue (button click)
    │
    ├─ useTeamManagement.handleCreateTeam()
    │   ├─ validateAuth()
    │   ├─ callTeamFunction('createTeam')
    │   ├─ waitForStoreUpdate (systemStore.team)
    │   ├─ waitForStoreUpdate (teamStore state)
    │   ├─ setDisplayName (random name)
    │   └─ showNotification('success')
    │
    └─ Firebase ◄─ Cloud Function
           │
           └─ Pinia Store Update ◄─ VueFire Binding
```

### Joining a Team via Invite

```
TeamInvite.vue (URL with team+code params)
    │
    ├─ useTeamInvite.acceptInvite()
    │   ├─ Verify authentication
    │   ├─ Leave previous team (if any)
    │   ├─ Join new team via Cloud Function
    │   └─ Show result notification
    │
    └─ Firebase ◄─ Cloud Function
           │
           └─ Pinia Store Update
```

### Copying Team URL

```
MyTeam.vue (copy button)
    │
    ├─ useTeamUrl.copyUrl()
    │   ├─ Generate URL with team+password params
    │   ├─ Copy to clipboard
    │   └─ Return success/error
    │
    └─ useTeamManagement.showNotification()
           └─ Feedback to user
```

## Component Responsibilities

### MyTeam.vue (87 LOC)
**Primary**: Display team information and management UI

**Responsibilities**:
- Show "no team" state or team invite URL
- Display create/leave team buttons
- Handle button interactions via composables
- Display notifications

**What it delegates**:
- Team operations → `useTeamManagement`
- URL management → `useTeamUrl`
- Display name sync → Handled in composable watch

### TeamInvite.vue (44 LOC)
**Primary**: Display and manage team invitations

**Responsibilities**:
- Show invite alert when URL parameters present
- Display accept/decline buttons
- Show result snackbar

**What it delegates**:
- Invite acceptance logic → `useTeamInvite`
- Team joining → Cloud Functions (via composable)
- Error handling → Composable

### TeamMembers.vue (72 LOC)
**Primary**: Display current team members

**Responsibilities**:
- List team members
- Show member cards
- Display team owner status

**What it delegates**:
- Nothing - already focused

### TeamOptions.vue (139 LOC)
**Primary**: Display visibility toggle options

**Responsibilities**:
- Task visibility toggles
- Item visibility toggles
- Map visibility toggles

**What it delegates**:
- Nothing - already focused

## Composable Responsibilities

### useTeamManagement (163 LOC)
**Purpose**: Handle team lifecycle operations

**Exports**:
- Functions: `handleCreateTeam()`, `handleLeaveTeam()`, `showNotification()`
- State: `loading`, `notification`, `isTeamOwner`
- Internal: `validateAuth()`, `callTeamFunction()`, `waitForStoreUpdate()`

**Manages**:
- Firebase Cloud Function calls
- Pinia store synchronization
- User notifications
- Display name updates

**Used by**:
- MyTeam.vue (primary)
- Could be used by any component needing team operations

### useTeamUrl (51 LOC)
**Purpose**: Manage team invite URL generation and sharing

**Exports**:
- Functions: `copyUrl()`
- Computed: `teamUrl`, `visibleUrl`

**Manages**:
- URL generation with parameters
- Clipboard operations
- Streamer mode masking

**Used by**:
- MyTeam.vue (primary)
- Could be used by team sharing components

### useTeamInvite (150 LOC)
**Purpose**: Handle team invitation acceptance

**Exports**:
- Functions: `acceptInvite()`, `declineInvite()`
- State: `declined`, `accepting`, `joinTeamSnackbar`, `joinResult`
- Computed: `hasInviteInUrl`, `inInviteTeam`

**Manages**:
- URL parameter parsing
- Team joining workflow
- Previous team leaving
- User feedback

**Used by**:
- TeamInvite.vue (primary)
- Could be used in onboarding flows

## State Management Strategy

### Store Layer (Unchanged)
```typescript
- useTeamStore()          // Team data (owner, members, password)
- useSystemStore()        // User system data (team ID, tokens)
- useTarkovStore()        // User progress data
- useUserStore()          // User preferences (streamer mode, etc)
```

### Composable Layer (New)
```typescript
- useTeamManagement       // Orchestrates store updates & operations
- useTeamUrl              // Derives display data from stores
- useTeamInvite           // Reads stores & triggers operations
```

### Component Layer
```typescript
- MyTeam, TeamInvite      // Use composables for logic
- Others                  // Direct store access if needed
```

## Benefits of This Architecture

✅ **Separation of Concerns**
- Components: UI & presentation
- Composables: Business logic & state management
- Stores: Persistent data & Firebase sync

✅ **Reusability**
- Composables can be used in multiple components
- Logic is not tightly coupled to UI

✅ **Testability**
- Composables can be unit tested independently
- Mock stores for testing composables

✅ **Maintainability**
- Clear responsibility boundaries
- Easy to find and modify logic
- Self-documenting code structure

✅ **Scalability**
- Add new features without modifying existing components
- Easy to add more composables as needed
- Composables can be combined easily

## Future Enhancement Opportunities

1. **Extract Notification Logic**
   ```typescript
   export function useNotification() {
     // Shared notification management
   }
   ```

2. **Extract Loading State**
   ```typescript
   export function useAsyncOperation() {
     // Shared async/loading patterns
   }
   ```

3. **Add Team Validation Composable**
   ```typescript
   export function useTeamValidation() {
     // Team-related validation rules
   }
   ```

4. **Add Team Permissions Composable**
   ```typescript
   export function useTeamPermissions() {
     // Role-based access control
   }
   ```

## Performance Considerations

- ✅ Composables use computed properties for reactive updates
- ✅ VueFire handles efficient Firebase bindings
- ✅ Store subscriptions only in needed components
- ✅ No unnecessary watchers or computations
- ✅ Code splitting automatically handles bundling

## Type Safety

All composables are fully typed:
- Function parameters typed
- Return types defined
- Computed properties have inferred types
- State properties explicitly typed

No `any` types in new code except for Firebase response handling (justified with comments).
