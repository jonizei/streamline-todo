# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Streamline Todo** is a multi-user, priority-based task queue server application. Users can create multiple queues (projects), and each queue maintains tasks that are automatically ordered by calculated priority. Each queue displays one "active" task at a time, with the next task becoming active only when the current one is removed.

## How to act
- Be concise
- Prefer minimal diffs
- Do not repeat code unless necessary
- No explanations unless asked
- Responsible for creating tests and testing the application (use test-writer agent)

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js (v20+)
- **Framework**: Express.js
- **Storage**: JSON files (nested directory structure)
- **Validation**: Zod
- **Authentication**: JWT (jsonwebtoken) + bcrypt for password hashing
- **Security**: helmet, express-rate-limit
- **Testing**: Vitest + supertest
- **Scheduling**: node-cron for background jobs

## Development Commands

```bash
# Install dependencies
npm install

# Development mode (watch mode)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Production mode
npm start

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run a single test file
npx vitest path/to/test.test.ts

# Type checking
npx tsc --noEmit

# Manually recalculate task priorities
npx tsx scripts/recalculate-priorities.ts
```

## Architecture

The application follows a layered architecture with multi-user support:

```
REST API Layer (Express routes with authentication middleware)
    ↓
Service Layer (business logic, queue management, user management)
    ↓
Repository Layer (JSON file operations via fs/promises)
    ↓
Storage (data/queues/{queue-id}/, data/users/{user-id}.json)
```

### Key Components

**Routes:**
- **`src/routes/auth.ts`**: User registration, login, profile management
- **`src/routes/queues.ts`**: Queue CRUD operations (protected)
- **`src/routes/tasks.ts`**: Task management within queues (protected)

**Services:**
- **`src/services/userService.ts`**: User registration, authentication, profile updates
- **`src/services/queueService.ts`**: Queue management with user ownership enforcement
- **`src/services/taskService.ts`**: Task operations with queue ownership verification
- **`src/services/priorityCalc.ts`**: Deadline-based priority calculation with auto-deadline generation
- **`src/services/priorityRecalculationService.ts`**: Automatic priority recalculation for all tasks
- **`src/services/scheduledJobs.ts`**: Cron-based background jobs (daily priority recalculation at 2 AM UTC)

**Repositories:**
- **`src/repositories/userRepository.ts`**: User persistence with email index
- **`src/repositories/queueRepository.ts`**: Queue persistence with user index
- **`src/repositories/taskRepository.ts`**: Task persistence within queue directories

**Models:**
- **`src/models/user.ts`**: User type and Zod schemas
- **`src/models/queue.ts`**: Queue type and Zod schemas (includes user_id)
- **`src/models/task.ts`**: Task type and Zod schemas (includes queue_id)

**Middleware:**
- **`src/middleware/auth.ts`**: JWT token verification
- **`src/middleware/errorHandler.ts`**: Centralized error handling

**Utilities:**
- **`src/utils/password.ts`**: Password hashing and comparison (bcrypt)
- **`src/utils/jwt.ts`**: JWT token generation and verification

### Repository Caching Strategy

All repositories maintain in-memory caches to avoid reading JSON files on every request:

**UserRepository:**
- Cache: `Map<string, User>` (by user ID)
- Email index: `Map<string, string>` (lowercase email → user ID)
- Loaded on initialization, synchronized on all writes

**QueueRepository:**
- Cache: `Map<string, Queue>` (by queue ID)
- User index: `Map<string, Set<string>>` (user ID → set of queue IDs)
- Loaded on initialization, synchronized on all writes

**TaskRepository:**
- Cache: `Map<string, Task>` (by task ID)
- Loaded on initialization, synchronized on all writes
- Queries are queue-scoped for performance

## Multi-User Architecture

### User Authentication

- **Registration**: Email + password (min 8 chars), bcrypt hashing
- **Login**: Returns JWT token (7-day expiry by default)
- **Authorization**: JWT Bearer token required on all queue/task endpoints
- **Token Format**: `Authorization: Bearer <jwt-token>`

### Data Ownership

- **Users** own **Queues**
- **Queues** own **Tasks**
- Users can only access their own queues and associated tasks
- Cross-user access attempts return 404 (not 403) to avoid information leakage

### Authorization Flow

1. User registers or logs in → receives JWT token
2. User includes token in Authorization header
3. Auth middleware validates token, adds `req.user` to request
4. Service layer verifies resource ownership (user owns queue)
5. Repository layer filters data by user ID

## Priority Calculation

Priority is calculated using a deadline-based urgency system:

**Formula**: `base + urgency_bonus` where:
- **Base**: `impact × 0.35 + urgency × 0.25 + relevance × 0.25 + effort_inv × 0.15`
- **Urgency Bonus**: `2.0 × e^(-0.10 × days_remaining)` (exponential decay)

**Auto-deadline Calculation** (if no custom deadline provided):
- Urgency 5 → 3 days
- Urgency 4 → 7 days
- Urgency 3 → 21 days
- Urgency 2 → 42 days
- Urgency 1 → 60 days

**Background Recalculation**: Scheduled daily at 2:00 AM UTC via node-cron to ensure tasks gain urgency as deadlines approach. Can also be manually triggered with `npx tsx scripts/recalculate-priorities.ts`.

Higher priority value = higher position in queue. See PRIORITY.md for detailed specification.

## Task Status Flow

Tasks have one of five statuses: `Queued`, `Active`, `Done`, `Blocked`, `Removed`

**Critical Rule**: Only ONE task can be `Active` per queue at any time.

### Active Task Transitions

The active task changes ONLY in these scenarios:

1. **Task marked as Done/Blocked/Removed**:
   - Set current active task status → `Done`/`Blocked`/`Removed`
   - Find highest priority `Queued` task → set to `Active`
   - If no queued tasks, queue becomes empty (valid state)

2. **Priority update causes demotion**:
   - If an `Active` task's priority is updated AND
   - A `Queued` task now has higher priority
   - Then: demote active → `Queued`, promote highest queued → `Active`

3. **First task in empty queue**:
   - Automatically promoted to `Active` on creation

## REST API Endpoints

### Authentication Endpoints (Public)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login and get JWT token |
| `GET` | `/api/auth/me` | Get current user profile (protected) |
| `PATCH` | `/api/auth/me` | Update user profile (protected) |

### Queue Management Endpoints (Protected)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/queues` | Get all queues for authenticated user |
| `GET` | `/api/queues/:queueId` | Get queue by ID (user must own) |
| `POST` | `/api/queues` | Create new queue |
| `PATCH` | `/api/queues/:queueId` | Update queue (user must own) |
| `DELETE` | `/api/queues/:queueId` | Delete queue and all tasks (user must own) |

### Task Management Endpoints (Protected, Queue-scoped)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/queues/:queueId/tasks/next` | Get active task (204 if none) |
| `GET` | `/api/queues/:queueId/tasks` | Get all tasks in queue |
| `GET` | `/api/queues/:queueId/tasks/:taskId` | Get specific task |
| `POST` | `/api/queues/:queueId/tasks` | Create task in queue |
| `PATCH` | `/api/queues/:queueId/tasks/:taskId` | Update task fields |
| `PATCH` | `/api/queues/:queueId/tasks/:taskId/status` | Update status (Done/Blocked/Removed) |

All queue and task endpoints require authentication. Users can only access their own resources.

## Data Models

### User

```typescript
interface User {
  id: string;              // UUID v4
  email: string;           // Unique, normalized to lowercase
  password_hash: string;   // Bcrypt hash (never sent to client)
  name?: string;           // Optional display name
  created_at: string;      // ISO 8601
  updated_at: string;      // ISO 8601
}
```

### Queue

```typescript
interface Queue {
  id: string;              // UUID v4
  user_id: string;         // Owner's user ID
  name: string;            // Queue name (1-200 chars)
  description?: string;    // Optional description (max 1000 chars)
  created_at: string;      // ISO 8601
  updated_at: string;      // ISO 8601
}
```

### Task

```typescript
interface Task {
  id: string;              // UUID v4
  queue_id: string;        // Parent queue ID
  title: string;           // Task title (1-200 chars)
  description?: string;    // Optional description (max 2000 chars)
  impact: number;          // 1–5
  urgency: number;         // 1–5
  relevance: number;       // 1–5
  effort: number;          // 1–5
  deadline: string;        // ISO 8601 datetime (auto-calculated from urgency if not provided)
  custom_deadline: boolean;// True if user provided deadline, false if auto-calculated
  priority: number;        // Calculated value (stored, rounded to 2 decimals)
  status: TaskStatus;      // 'Queued' | 'Active' | 'Done' | 'Blocked' | 'Removed'
  created_at: string;      // ISO 8601
  updated_at: string;      // ISO 8601
}
```

## Storage Format

### Directory Structure

```
data/
├── users/
│   ├── {user-id-1}.json
│   ├── {user-id-2}.json
│   └── ...
└── queues/
    ├── {queue-id-1}/
    │   ├── queue.json
    │   └── tasks/
    │       ├── {task-id-1}.json
    │       ├── {task-id-2}.json
    │       └── ...
    ├── {queue-id-2}/
    │   ├── queue.json
    │   └── tasks/
    │       └── ...
    └── ...
```

### Example Files

**User** (`data/users/{uuid}.json`):
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "password_hash": "$2b$10$...",
  "name": "John Doe",
  "created_at": "2026-04-01T10:00:00.000Z",
  "updated_at": "2026-04-01T10:00:00.000Z"
}
```

**Queue** (`data/queues/{queue-uuid}/queue.json`):
```json
{
  "id": "queue-uuid",
  "user_id": "user-uuid",
  "name": "Work Projects",
  "description": "Tasks for work",
  "created_at": "2026-04-01T10:00:00.000Z",
  "updated_at": "2026-04-01T10:00:00.000Z"
}
```

**Task** (`data/queues/{queue-uuid}/tasks/{task-uuid}.json`):
```json
{
  "id": "task-uuid",
  "queue_id": "queue-uuid",
  "title": "API documentation",
  "description": "Create OpenAPI spec",
  "impact": 4,
  "urgency": 3,
  "relevance": 5,
  "effort": 2,
  "deadline": "2026-04-22T00:00:00.000Z",
  "custom_deadline": false,
  "priority": 2.05,
  "status": "Queued",
  "created_at": "2026-04-01T10:00:00.000Z",
  "updated_at": "2026-04-01T10:00:00.000Z"
}
```

## Error Handling

HTTP status codes:
- `200`: Success
- `201`: Created
- `204`: No content (empty queue, successful delete)
- `400`: Validation error (invalid parameters)
- `401`: Authentication required or invalid token
- `404`: Resource not found (or user doesn't own it)
- `409`: Conflict (email already exists, invalid state transition)
- `500`: Internal server error

## Security Features

- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Tokens**: Signed with secret, 7-day expiry (configurable)
- **Rate Limiting**: 10 requests per 15 minutes on auth endpoints
- **Security Headers**: helmet middleware for HTTP headers
- **Input Validation**: Zod schemas on all inputs
- **Authorization**: Service layer verifies resource ownership
- **Information Hiding**: 404 instead of 403 for unauthorized access

## Testing

Tests use separate directories to avoid interfering with actual data:
- `data/queues-test/` for queue/task data
- `data/users-test/` for user data

Test configuration in `tests/setup.ts` sets environment variables before module loading.

### Test Files

- `tests/priorityCalc.test.ts`: Priority calculation unit tests (22 tests)
- `tests/taskService.test.ts`: Task service unit tests (34 tests)
- `tests/userModel.test.ts`: User model validation tests (21 tests)
- `tests/userRepository.test.ts`: User repository integration tests (25 tests)
- `tests/userService.test.ts`: User service unit tests (14 tests)
- `tests/authUtils.test.ts`: Auth utility tests (16 tests)
- `tests/authRoutes.test.ts`: Auth API integration tests (29 tests)
- `tests/routes.test.ts`: Queue and task API integration tests (75 tests)
- `tests/authorization.test.ts`: Multi-user authorization tests (15 tests)

**Total: 251 tests, 100% pass rate**

### Test Configuration

- **Vitest Config**: `fileParallelism: false` to prevent race conditions
- **Setup File**: `tests/setup.ts` configures test environment
- **Mocking**: User service tests use vi.mock for dependencies
- **Integration**: API tests use supertest with real Express app

## Configuration

Environment variables (see `.env.example`):

- **PORT**: Server port (default: 3000)
- **QUEUES_DIR**: Queue storage directory (default: `data/queues`)
- **USERS_DIR**: User storage directory (default: `data/users`)
- **JWT_SECRET**: Secret key for JWT signing (REQUIRED in production)
- **JWT_EXPIRES_IN**: Token expiry duration (default: `7d`)
- **NODE_ENV**: Environment (`development`, `test`, `production`)

**IMPORTANT**: Always set a strong, random JWT_SECRET in production. Never commit `.env` to version control.

## Migration

For existing single-user deployments, use the migration script:

```bash
npx tsx scripts/migrate-to-multiuser.ts <default-user-id>
```

This adds `user_id` fields to existing queues.
