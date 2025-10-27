# TarkovTracker - API Contracts Documentation

**Generated:** 2025-10-21
**API Version:** v1 and v2
**Base URL:** `https://<region>-<project>.cloudfunctions.net/api`

---

## Overview

The TarkovTracker REST API provides programmatic access to progress tracking, team management, and API token operations. All endpoints require authentication via Bearer tokens and implement permission-based access control.

**API Documentation:** Full Scalar UI available in the app at `/api-docs` or generate OpenAPI spec at `functions/openapi/openapi.json`

---

## Authentication

### Bearer Token Authentication

All API requests (except `/health`) require a Bearer token in the Authorization header:

```http
Authorization: Bearer <token>
```

### Token Types

**1. Firebase Auth Token**

- Issued by Firebase Authentication
- Used for user-authenticated requests
- Short-lived (1 hour)
- Automatically refreshed by Firebase SDK

**2. API Access Token**

- User-generated via UI
- Stored in user's Firestore document
- Long-lived (until revoked)
- Permission-scoped (GP, WP, TP)
- Game mode support (PvP, PvE, Dual)

---

## API Versioning

### Version Strategy

**Two API Versions:**

- `/api/*` - Original API (v1)
- `/api/v2/*` - Current API (v2)

Both versions currently share the same implementation for backward compatibility. Future breaking changes will be introduced in v2 only.

---

## Permission System

### Permission Scopes

| Permission | Code | Description |
|------------|------|-------------|
| Get Progress | `GP` | Read user's progress data |
| Write Progress | `WP` | Modify user's progress data |
| Team Progress | `TP` | Access team member progress |

### Permission Requirements

- Each endpoint specifies required permissions
- API tokens must include necessary permissions
- Missing permissions return `403 Forbidden`

---

## Game Mode Support

### Game Modes

| Mode | Description |
|------|-------------|
| `pvp` | PvP (Player vs Player) mode progress |
| `pve` | PvE (Player vs Environment) mode progress |
| `dual` | Access to both PvP and PvE |

### Game Mode in Requests

**For single-mode tokens:**

- Game mode is pre-configured in the token
- Query parameter ignored

**For dual-mode tokens:**

- Specify mode via `gameMode` query parameter
- Example: `?gameMode=pve`
- Defaults to `pvp` if not specified

---

## Common Response Format

### Success Response

```json
{
  "success": true,
  "data": { /* response data */ },
  "meta": {
    "self": "user-uid",
    "gameMode": "pvp"
  }
}
```

### Error Response

```json
{
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (invalid input) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

---

## API Endpoints

## 1. Progress Endpoints

### GET /api/progress

**Description:** Retrieve user's game progress

**Authentication:** Required (Bearer token)
**Permission:** `GP` (Get Progress)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| gameMode | string | No | pvp | Game mode (`pvp`, `pve`) - only for dual tokens |

**Response 200 - Success:**

```json
{
  "success": true,
  "data": {
    "level": 42,
    "tasks": {
      "task-id-1": {
        "completed": true,
        "objectives": {
          "obj-id-1": true,
          "obj-id-2": false
        }
      },
      "task-id-2": {
        "completed": false,
        "objectives": {}
      }
    },
    "hideout": {
      "station-id-1": {
        "level": 3,
        "completed": true
      }
    }
  },
  "meta": {
    "self": "user-uid-123",
    "gameMode": "pvp"
  }
}
```

**Response 401 - Unauthorized:**

```json
{
  "error": "Invalid token or missing 'GP' permission"
}
```

**Example Request:**

```bash
curl -X GET "https://us-central1-project.cloudfunctions.net/api/progress?gameMode=pvp" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### POST /api/progress/level/:levelValue

**Description:** Update player's level

**Authentication:** Required (Bearer token)
**Permission:** `WP` (Write Progress)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| levelValue | integer | Yes | New player level (1-79) |

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| gameMode | string | No | pvp | Game mode (`pvp`, `pve`) - only for dual tokens |

**Response 200 - Success:**

```json
{
  "success": true,
  "data": {
    "level": 42,
    "updated": true
  },
  "meta": {
    "self": "user-uid-123",
    "gameMode": "pvp"
  }
}
```

**Response 400 - Bad Request:**

```json
{
  "error": "Level must be between 1 and 79"
}
```

**Example Request:**

```bash
curl -X POST "https://us-central1-project.cloudfunctions.net/api/progress/level/42" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### POST /api/progress/task/:taskId

**Description:** Mark a task as completed or incomplete

**Authentication:** Required (Bearer token)
**Permission:** `WP` (Write Progress)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| taskId | string | Yes | Task identifier (e.g., "5c0d4c12d09282029f539173") |

**Request Body:**

```json
{
  "completed": true
}
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| gameMode | string | No | pvp | Game mode (`pvp`, `pve`) - only for dual tokens |

**Response 200 - Success:**

```json
{
  "success": true,
  "data": {
    "taskId": "5c0d4c12d09282029f539173",
    "completed": true,
    "updated": true
  },
  "meta": {
    "self": "user-uid-123",
    "gameMode": "pvp"
  }
}
```

**Example Request:**

```bash
curl -X POST "https://us-central1-project.cloudfunctions.net/api/progress/task/5c0d4c12d09282029f539173" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

---

### POST /api/progress/tasks

**Description:** Batch update multiple tasks

**Authentication:** Required (Bearer token)
**Permission:** `WP` (Write Progress)

**Request Body:**

```json
{
  "tasks": [
    {
      "taskId": "task-id-1",
      "completed": true
    },
    {
      "taskId": "task-id-2",
      "completed": false
    }
  ]
}
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| gameMode | string | No | pvp | Game mode (`pvp`, `pve`) - only for dual tokens |

**Response 200 - Success:**

```json
{
  "success": true,
  "data": {
    "updated": 2,
    "tasks": [
      {
        "taskId": "task-id-1",
        "completed": true
      },
      {
        "taskId": "task-id-2",
        "completed": false
      }
    ]
  },
  "meta": {
    "self": "user-uid-123",
    "gameMode": "pvp"
  }
}
```

**Example Request:**

```bash
curl -X POST "https://us-central1-project.cloudfunctions.net/api/progress/tasks" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"tasks":[{"taskId":"task-1","completed":true}]}'
```

---

### POST /api/progress/task/objective/:objectiveId

**Description:** Update a specific task objective

**Authentication:** Required (Bearer token)
**Permission:** `WP` (Write Progress)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| objectiveId | string | Yes | Objective identifier |

**Request Body:**

```json
{
  "completed": true
}
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| gameMode | string | No | pvp | Game mode (`pvp`, `pve`) - only for dual tokens |

**Response 200 - Success:**

```json
{
  "success": true,
  "data": {
    "objectiveId": "obj-id-123",
    "completed": true,
    "updated": true
  },
  "meta": {
    "self": "user-uid-123",
    "gameMode": "pvp"
  }
}
```

**Example Request:**

```bash
curl -X POST "https://us-central1-project.cloudfunctions.net/api/progress/task/objective/obj-123" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

---

## 2. Team Endpoints

### GET /api/team/progress

**Description:** Get progress data for all team members

**Authentication:** Required (Bearer token)
**Permission:** `TP` (Team Progress)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| gameMode | string | No | pvp | Game mode (`pvp`, `pve`) - only for dual tokens |

**Response 200 - Success:**

```json
{
  "success": true,
  "data": [
    {
      "userId": "user-uid-1",
      "username": "Player1",
      "level": 42,
      "tasks": {
        "task-id-1": {
          "completed": true
        }
      }
    },
    {
      "userId": "user-uid-2",
      "username": "Player2",
      "level": 38,
      "tasks": {
        "task-id-1": {
          "completed": false
        }
      }
    }
  ],
  "meta": {
    "self": "user-uid-1",
    "gameMode": "pvp",
    "hiddenTeammates": []
  }
}
```

**Response 401 - Unauthorized:**

```json
{
  "error": "Invalid token or missing 'TP' permission"
}
```

**Response 404 - Not Found:**

```json
{
  "error": "User is not in a team"
}
```

**Example Request:**

```bash
curl -X GET "https://us-central1-project.cloudfunctions.net/api/team/progress?gameMode=pvp" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### POST /api/team/create

**Description:** Create a new team

**Authentication:** Required (Bearer token)

**Request Body:**

```json
{
  "password": "optional-custom-password",
  "maximumMembers": 10
}
```

**Request Body Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| password | string | No | Auto-generated | Team password (48-char if auto) |
| maximumMembers | integer | No | 10 | Max team size (1-10) |

**Response 200 - Success:**

```json
{
  "team": "team-id-32-characters-long",
  "password": "auto-generated-password-48-characters"
}
```

**Response 400 - Bad Request:**

```json
{
  "error": "User is already in a team"
}
```

**Response 400 - Cooldown:**

```json
{
  "error": "You must wait 5 minutes after leaving a team to create a new one"
}
```

**Example Request:**

```bash
curl -X POST "https://us-central1-project.cloudfunctions.net/api/team/create" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"maximumMembers": 5}'
```

---

### POST /api/team/join

**Description:** Join an existing team

**Authentication:** Required (Bearer token)

**Request Body:**

```json
{
  "id": "team-id-32-characters-long",
  "password": "team-password"
}
```

**Request Body Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Team ID (32 characters) |
| password | string | Yes | Team password |

**Response 200 - Success:**

```json
{
  "joined": true
}
```

**Response 400 - Bad Request:**

```json
{
  "error": "User is already in a team"
}
```

**Response 401 - Wrong Password:**

```json
{
  "error": "Wrong password"
}
```

**Response 404 - Not Found:**

```json
{
  "error": "Team doesn't exist"
}
```

**Response 429 - Team Full:**

```json
{
  "error": "Team is full"
}
```

**Example Request:**

```bash
curl -X POST "https://us-central1-project.cloudfunctions.net/api/team/join" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"id":"team-id-here","password":"team-password-here"}'
```

---

### POST /api/team/leave

**Description:** Leave current team

**Authentication:** Required (Bearer token)

**Request Body:** None required

**Response 200 - Success:**

```json
{
  "left": true
}
```

**Response 400 - Bad Request:**

```json
{
  "error": "User is not in a team"
}
```

**Note:** If the user is the team owner, leaving will delete the team and remove all members.

**Example Request:**

```bash
curl -X POST "https://us-central1-project.cloudfunctions.net/api/team/leave" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 3. Token Endpoints

### GET /api/token

**Description:** Get API token information

**Authentication:** Required (Bearer token)

**Response 200 - Success:**

```json
{
  "success": true,
  "data": {
    "tokenId": "token-id-123",
    "owner": "user-uid-123",
    "permissions": ["GP", "WP", "TP"],
    "gameMode": "dual",
    "note": "My third-party integration token",
    "createdAt": "2025-10-21T00:00:00.000Z",
    "lastUsed": "2025-10-21T12:30:00.000Z",
    "active": true
  }
}
```

**Response 401 - Unauthorized:**

```json
{
  "error": "Invalid token"
}
```

**Example Request:**

```bash
curl -X GET "https://us-central1-project.cloudfunctions.net/api/token" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 4. User Management Endpoints

### DELETE /api/user/account

**Description:** Delete user account and all associated data

**Authentication:** Required (Recent auth - token <5 minutes old)

**Request Body:**

```json
{
  "confirmationText": "DELETE MY ACCOUNT"
}
```

**Request Body Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| confirmationText | string | Yes | Must be exactly "DELETE MY ACCOUNT" |

**Response 200 - Success:**

```json
{
  "deleted": true,
  "message": "Account deleted successfully"
}
```

**Response 400 - Invalid Confirmation:**

```json
{
  "error": "Invalid confirmation text"
}
```

**Response 401 - Stale Token:**

```json
{
  "error": "Recent authentication required. Please re-authenticate."
}
```

**Example Request:**

```bash
curl -X DELETE "https://us-central1-project.cloudfunctions.net/api/user/account" \
  -H "Authorization: Bearer YOUR_RECENT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"confirmationText":"DELETE MY ACCOUNT"}'
```

---

## 5. System Endpoints

### GET /health

**Description:** API health check

**Authentication:** None required

**Response 200:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-21T12:00:00.000Z",
    "version": "2.0.0",
    "service": "tarkovtracker-api",
    "features": {
      "newErrorHandling": true,
      "newProgressService": true,
      "newTeamService": true,
      "newTokenService": true
    }
  }
}
```

**Example Request:**

```bash
curl -X GET "https://us-central1-project.cloudfunctions.net/api/health"
```

---

## Rate Limiting

### Abuse Prevention

**Rate Limit:** Enforced per user via `abuseGuard` middleware
**Behavior:**

- Tracks request frequency per user
- Detects suspicious patterns
- Temporary blocks for violations
- Returns `429 Too Many Requests` when limited

**Best Practices:**

- Implement exponential backoff
- Cache responses when possible
- Batch operations when supported (e.g., `/progress/tasks`)

---

## Data Types & Schemas

### Progress Schema

```typescript
interface Progress {
  level: number;                      // Player level (1-79)
  tasks: {
    [taskId: string]: {
      completed: boolean;
      objectives?: {
        [objectiveId: string]: boolean;
      };
    };
  };
  hideout?: {
    [stationId: string]: {
      level: number;
      completed: boolean;
    };
  };
}
```

### Team Member Schema

```typescript
interface TeamMember {
  userId: string;                     // User UID
  username?: string;                  // Display name
  level: number;                      // Current level
  tasks: {                            // Task completion status
    [taskId: string]: {
      completed: boolean;
    };
  };
}
```

### API Token Schema

```typescript
interface ApiToken {
  tokenId: string;                    // Token identifier
  owner: string;                      // User UID
  token: string;                      // Bearer token value
  permissions: string[];              // ['GP', 'WP', 'TP']
  gameMode: 'pvp' | 'pve' | 'dual';  // Allowed game modes
  note: string;                       // User description
  createdAt: string;                  // ISO 8601 timestamp
  lastUsed: string;                   // ISO 8601 timestamp
  active: boolean;                    // Token status
}
```

---

## Error Codes Reference

| HTTP Status | Error Type | Description |
|-------------|------------|-------------|
| 400 | invalid-argument | Invalid request parameters or body |
| 400 | failed-precondition | Operation cannot proceed (e.g., already in team) |
| 401 | unauthenticated | Missing or invalid authentication |
| 403 | permission-denied | Insufficient permissions |
| 404 | not-found | Resource doesn't exist |
| 429 | resource-exhausted | Rate limit exceeded or resource full |
| 500 | internal | Server error |

---

## Code Examples

### JavaScript/TypeScript (Node.js)

```typescript
import fetch from 'node-fetch';

const API_BASE = 'https://us-central1-project.cloudfunctions.net/api';
const TOKEN = 'your-api-token-here';

// Get progress
async function getProgress(gameMode = 'pvp') {
  const response = await fetch(`${API_BASE}/progress?gameMode=${gameMode}`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`
    }
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return await response.json();
}

// Update task
async function updateTask(taskId, completed) {
  const response = await fetch(`${API_BASE}/progress/task/${taskId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ completed })
  });

  return await response.json();
}

// Get team progress
async function getTeamProgress() {
  const response = await fetch(`${API_BASE}/team/progress`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`
    }
  });

  return await response.json();
}
```

### Python

```python
import requests

API_BASE = 'https://us-central1-project.cloudfunctions.net/api'
TOKEN = 'your-api-token-here'

headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json'
}

# Get progress
def get_progress(game_mode='pvp'):
    response = requests.get(
        f'{API_BASE}/progress',
        params={'gameMode': game_mode},
        headers=headers
    )
    response.raise_for_status()
    return response.json()

# Update task
def update_task(task_id, completed):
    response = requests.post(
        f'{API_BASE}/progress/task/{task_id}',
        json={'completed': completed},
        headers=headers
    )
    return response.json()

# Get team progress
def get_team_progress():
    response = requests.get(
        f'{API_BASE}/team/progress',
        headers=headers
    )
    return response.json()
```

---

## Best Practices

### Authentication

- Store tokens securely (environment variables, secrets management)
- Never commit tokens to version control
- Rotate tokens periodically
- Use minimal permissions required

### Error Handling

- Check HTTP status codes
- Parse error messages from response body
- Implement retry logic with exponential backoff
- Log errors for debugging

### Performance

- Cache progress data when possible
- Use batch endpoints (`/progress/tasks`) for multiple updates
- Implement client-side rate limiting
- Reuse HTTP connections

### Data Validation

- Validate task IDs before sending requests
- Ensure level values are within valid range (1-79)
- Check team ID format (32 characters)
- Verify confirmation text for sensitive operations

---

## API Changelog

### v2.0.0 (Current)

- Service-based architecture
- Improved error handling
- OpenAPI documentation
- Game mode support (PvP/PvE/Dual)
- Permission-based access control
- Rate limiting implementation

### v1.0.0 (Legacy)

- Initial API release
- Basic progress tracking
- Team management

---

*For the complete interactive API documentation with request/response examples, run `npm run docs` to generate the OpenAPI spec at `functions/openapi/openapi.json`, which is consumed by Scalar UI in the app.*
