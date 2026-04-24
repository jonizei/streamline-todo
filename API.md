# Streamline Todo API Reference

Complete REST API documentation for Streamline Todo task queue server.

**Base URL:** `http://localhost:3000/api`

## Table of Contents

- [Queue Management](#queue-management)
  - [Create Queue](#create-queue)
  - [List Queues](#list-queues)
  - [Get Queue](#get-queue)
  - [Update Queue](#update-queue)
  - [Delete Queue](#delete-queue)
- [Task Management](#task-management)
  - [Get Active Task](#get-active-task)
  - [List Tasks](#list-tasks)
  - [Get Task](#get-task)
  - [Create Task](#create-task)
  - [Update Task](#update-task)
  - [Update Task Status](#update-task-status)
- [Error Responses](#error-responses)
- [Priority Calculation](#priority-calculation)
- [Workflow Examples](#workflow-examples)

---

## Authentication

All endpoints except registration and login require a valid JWT token in the `Authorization` header:
`Authorization: Bearer <your-jwt-token>`

### Register User

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars)",
  "name": "string (optional, 1-100 chars)"
}
```

**Response:** `201 Created`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "0d1cfb8c-cd8a-4451-8e03-2e080c7d106e",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2026-04-05T10:00:00.000Z",
    "updated_at": "2026-04-05T10:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Validation error (invalid email, short password)
- `409` - Email already exists

---

### Login User

Authenticate and receive a JWT token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "0d1cfb8c-cd8a-4451-8e03-2e080c7d106e",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2026-04-05T10:00:00.000Z",
    "updated_at": "2026-04-05T10:00:00.000Z"
  }
}
```

**Errors:**
- `401` - Invalid email or password

---

### Get Current User

Get the profile of the currently authenticated user.

**Endpoint:** `GET /api/auth/me`

**Headers:**
- `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "0d1cfb8c-cd8a-4451-8e03-2e080c7d106e",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2026-04-05T10:00:00.000Z",
  "updated_at": "2026-04-05T10:00:00.000Z"
}
```

**Errors:**
- `401` - Missing or invalid token

---

### Update Profile

Update the current user's email, name, or password.

**Endpoint:** `PATCH /api/auth/me`

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "email": "string (optional)",
  "name": "string (optional)",
  "password": "string (optional, min 8 chars)"
}
```

**Response:** `200 OK`
```json
{
  "id": "0d1cfb8c-cd8a-4451-8e03-2e080c7d106e",
  "email": "new-email@example.com",
  "name": "Updated Name",
  "created_at": "2026-04-05T10:00:00.000Z",
  "updated_at": "2026-04-06T12:00:00.000Z"
}
```

**Errors:**
- `400` - Validation error
- `401` - Missing or invalid token
- `409` - Email already in use by another user

---

## Queue Management

### Create Queue

Create a new task queue.

**Endpoint:** `POST /api/queues`

**Request Body:**
```json
{
  "name": "string (required, 1-100 chars)",
  "description": "string (optional, max 500 chars)"
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Projects",
  "description": "Personal side projects",
  "created_at": "2026-04-05T10:00:00.000Z",
  "updated_at": "2026-04-05T10:00:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/queues \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Work Tasks",
    "description": "Professional responsibilities"
  }'
```

**Errors:**
- `400` - Validation error (missing name, empty name, exceeds max length)

---

### List Queues

Get all queues sorted by creation date.

**Endpoint:** `GET /api/queues`

**Response:** `200 OK`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Work Tasks",
    "description": "Professional responsibilities",
    "created_at": "2026-04-05T10:00:00.000Z",
    "updated_at": "2026-04-05T10:00:00.000Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Personal Projects",
    "description": null,
    "created_at": "2026-04-05T11:00:00.000Z",
    "updated_at": "2026-04-05T11:00:00.000Z"
  }
]
```

**Example:**
```bash
curl http://localhost:3000/api/queues
```

**Notes:**
- Returns empty array `[]` if no queues exist
- Queues ordered by `created_at` (oldest first)

---

### Get Queue

Get a specific queue by ID.

**Endpoint:** `GET /api/queues/:queueId`

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Work Tasks",
  "description": "Professional responsibilities",
  "created_at": "2026-04-05T10:00:00.000Z",
  "updated_at": "2026-04-05T10:00:00.000Z"
}
```

**Example:**
```bash
curl http://localhost:3000/api/queues/550e8400-e29b-41d4-a716-446655440000
```

**Errors:**
- `404` - Queue not found
- `400` - Invalid UUID format

---

### Update Queue

Update queue name or description.

**Endpoint:** `PATCH /api/queues/:queueId`

**Request Body:**
```json
{
  "name": "string (optional, 1-100 chars)",
  "description": "string (optional, max 500 chars or null)"
}
```

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Updated Name",
  "description": "Updated description",
  "created_at": "2026-04-05T10:00:00.000Z",
  "updated_at": "2026-04-05T12:00:00.000Z"
}
```

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/queues/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Work - High Priority",
    "description": "Urgent work items only"
  }'
```

**Errors:**
- `404` - Queue not found
- `400` - Validation error (empty name, exceeds max length)

---

### Delete Queue

Delete a queue and all its tasks.

**Endpoint:** `DELETE /api/queues/:queueId`

**Response:** `204 No Content`

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/queues/550e8400-e29b-41d4-a716-446655440000
```

**Errors:**
- `404` - Queue not found

**Notes:**
- Deletes all tasks in the queue (cascade delete)
- Removes the entire queue directory from storage

---

## Task Management

### Get Active Task

Get the current active task for a queue (the task you should work on now).

**Endpoint:** `GET /api/queues/:queueId/tasks/next`

**Response:** `200 OK`
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "queue_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Fix critical security bug",
  "description": "SQL injection vulnerability in login endpoint",
  "impact": 5,
  "urgency": 5,
  "relevance": 5,
  "effort": 2,
  "priority": 6.8,
  "status": "Active",
  "created_at": "2026-04-05T10:30:00.000Z",
  "updated_at": "2026-04-05T10:30:00.000Z"
}
```

**Response (No Active Task):** `204 No Content`

**Example:**
```bash
curl http://localhost:3000/api/queues/550e8400-e29b-41d4-a716-446655440000/tasks/next
```

**Errors:**
- `404` - Queue not found

**Notes:**
- Returns `204 No Content` if queue is empty or all tasks are done/blocked/removed
- Only one task per queue can have `status: "Active"`

---

### List Tasks

Get all tasks in a queue, sorted by priority (highest first).

**Endpoint:** `GET /api/queues/:queueId/tasks`

**Response:** `200 OK`
```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "queue_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Fix critical security bug",
    "description": "SQL injection vulnerability",
    "impact": 5,
    "urgency": 5,
    "relevance": 5,
    "effort": 2,
    "priority": 6.8,
    "status": "Active",
    "created_at": "2026-04-05T10:30:00.000Z",
    "updated_at": "2026-04-05T10:30:00.000Z"
  },
  {
    "id": "880e8400-e29b-41d4-a716-446655440001",
    "queue_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Write API documentation",
    "description": null,
    "impact": 4,
    "urgency": 3,
    "relevance": 5,
    "effort": 3,
    "priority": 3.65,
    "status": "Queued",
    "created_at": "2026-04-05T11:00:00.000Z",
    "updated_at": "2026-04-05T11:00:00.000Z"
  }
]
```

**Example:**
```bash
curl http://localhost:3000/api/queues/550e8400-e29b-41d4-a716-446655440000/tasks
```

**Errors:**
- `404` - Queue not found

**Notes:**
- Returns empty array `[]` if queue has no tasks
- Tasks sorted by priority (descending), then by creation date
- Includes tasks with all statuses (Active, Queued, Done, Blocked, Removed)

---

### Get Task

Get a specific task by ID.

**Endpoint:** `GET /api/queues/:queueId/tasks/:taskId`

**Response:** `200 OK`
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "queue_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Fix critical security bug",
  "description": "SQL injection vulnerability in login endpoint",
  "impact": 5,
  "urgency": 5,
  "relevance": 5,
  "effort": 2,
  "priority": 6.8,
  "status": "Active",
  "created_at": "2026-04-05T10:30:00.000Z",
  "updated_at": "2026-04-05T10:30:00.000Z"
}
```

**Example:**
```bash
curl http://localhost:3000/api/queues/550e8400-e29b-41d4-a716-446655440000/tasks/770e8400-e29b-41d4-a716-446655440000
```

**Errors:**
- `404` - Queue not found
- `404` - Task not found
- `404` - Task exists but belongs to a different queue

---

### Create Task

Create a new task in a queue.

**Endpoint:** `POST /api/queues/:queueId/tasks`

**Request Body:**
```json
{
  "title": "string (required, 1-200 chars)",
  "description": "string (optional, max 2000 chars)",
  "impact": "integer (required, 1-5)",
  "urgency": "integer (required, 1-5)",
  "relevance": "integer (required, 1-5)",
  "effort": "integer (required, 1-5)"
}
```

**Response:** `201 Created`
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "queue_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Fix critical security bug",
  "description": "SQL injection vulnerability in login endpoint",
  "impact": 5,
  "urgency": 5,
  "relevance": 5,
  "effort": 2,
  "priority": 6.8,
  "status": "Active",
  "created_at": "2026-04-05T10:30:00.000Z",
  "updated_at": "2026-04-05T10:30:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/queues/550e8400-e29b-41d4-a716-446655440000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication to API",
    "impact": 5,
    "urgency": 4,
    "relevance": 5,
    "effort": 3
  }'
```

**Errors:**
- `404` - Queue not found
- `400` - Validation error (missing fields, invalid ranges, non-integer values)

**Notes:**
- Priority is automatically calculated based on the formula (see [Priority Calculation](#priority-calculation))
- If queue is empty, task is automatically set to `status: "Active"`
- If queue has an active task, new task is set to `status: "Queued"`
- Task IDs are UUIDs (v4)

**Priority Parameter Guidelines:**

| Parameter | 1 | 2 | 3 | 4 | 5 |
|-----------|---|---|---|---|---|
| **Impact** | Minimal | Low | Medium | High | Critical |
| **Urgency** | No deadline | Weeks away | Days away | Tomorrow | Today |
| **Relevance** | Off-topic | Tangential | Related | Aligned | Core mission |
| **Effort** | Minutes | Hours | Days | Weeks | Months |

---

### Update Task

Update task properties and recalculate priority.

**Endpoint:** `PATCH /api/queues/:queueId/tasks/:taskId`

**Request Body:**
```json
{
  "title": "string (optional, 1-200 chars)",
  "description": "string (optional, max 2000 chars or null)",
  "impact": "integer (optional, 1-5)",
  "urgency": "integer (optional, 1-5)",
  "relevance": "integer (optional, 1-5)",
  "effort": "integer (optional, 1-5)"
}
```

**Response:** `200 OK`
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "queue_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Fix critical security bug - URGENT",
  "description": "SQL injection in login + password reset endpoints",
  "impact": 5,
  "urgency": 5,
  "relevance": 5,
  "effort": 3,
  "priority": 6.55,
  "status": "Active",
  "created_at": "2026-04-05T10:30:00.000Z",
  "updated_at": "2026-04-05T12:00:00.000Z"
}
```

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/queues/550e8400-e29b-41d4-a716-446655440000/tasks/770e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix critical security bug - URGENT",
    "urgency": 5,
    "impact": 5
  }'
```

**Errors:**
- `404` - Queue not found
- `404` - Task not found
- `400` - Validation error (empty title, invalid ranges, non-integer values)

**Notes:**
- Priority is automatically recalculated when impact/urgency/relevance/effort changes
- If an `Active` task's priority drops below a `Queued` task, automatic demotion/promotion occurs
- Cannot update `status` via this endpoint (use [Update Task Status](#update-task-status))
- Cannot update `Done`, `Blocked`, or `Removed` tasks

---

### Update Task Status

Change task status to Done, Blocked, or Removed.

**Endpoint:** `PATCH /api/queues/:queueId/tasks/:taskId/status`

**Request Body:**
```json
{
  "status": "Done | Blocked | Removed"
}
```

**Response:** `200 OK`
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "queue_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Fix critical security bug",
  "description": "SQL injection vulnerability in login endpoint",
  "impact": 5,
  "urgency": 5,
  "relevance": 5,
  "effort": 2,
  "priority": 6.8,
  "status": "Done",
  "created_at": "2026-04-05T10:30:00.000Z",
  "updated_at": "2026-04-05T14:00:00.000Z"
}
```

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/queues/550e8400-e29b-41d4-a716-446655440000/tasks/770e8400-e29b-41d4-a716-446655440000/status \
  -H "Content-Type: application/json" \
  -d '{"status": "Done"}'
```

**Errors:**
- `404` - Queue not found
- `404` - Task not found
- `400` - Invalid status value
- `409` - Cannot change status from terminal state (Done/Blocked/Removed)

**Notes:**
- When an `Active` task is marked `Done`, `Blocked`, or `Removed`, the highest priority `Queued` task is automatically promoted to `Active`
- Status changes from `Done`, `Blocked`, or `Removed` are not allowed (terminal states)
- Valid transitions:
  - `Queued` → `Done`, `Blocked`, `Removed`
  - `Active` → `Done`, `Blocked`, `Removed`

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| `200` | OK | Successful GET, PATCH |
| `201` | Created | Successful POST |
| `204` | No Content | Successful DELETE, or no active task available |
| `400` | Bad Request | Validation errors, invalid input |
| `404` | Not Found | Queue or task doesn't exist |
| `409` | Conflict | Invalid state transition |
| `500` | Internal Server Error | Unexpected server error |

### Validation Errors

**Example - Missing required field:**
```json
{
  "error": "Validation error: Required field 'title' is missing"
}
```

**Example - Out of range value:**
```json
{
  "error": "Validation error: 'impact' must be between 1 and 5"
}
```

**Example - Non-integer value:**
```json
{
  "error": "Validation error: 'effort' must be an integer"
}
```

---

## Priority Calculation

Tasks are automatically prioritized using this formula:

```
Effort_inv = 6 - Effort
Priority = Impact × 0.35 + Urgency × 0.25 + Relevance × 0.25 + Effort_inv × 0.15

If Urgency == 5:
    Priority += 2.0
```

### Priority Examples

| Task | I | U | R | E | Priority | Notes |
|------|---|---|---|---|----------|-------|
| Critical bug fix | 5 | 5 | 5 | 2 | **6.80** | Max impact + critical urgency boost |
| New feature | 4 | 3 | 5 | 3 | **3.65** | Good balance, medium priority |
| Refactoring | 2 | 1 | 3 | 4 | **1.95** | Low urgency, higher effort |
| Quick win | 3 | 2 | 3 | 1 | **2.70** | Low effort boosts priority |
| Emergency hotfix | 3 | 5 | 4 | 1 | **4.70** | Critical urgency = +2.0 boost |

**Key Insights:**
- Maximum priority: **7.0** (all 5s with critical urgency)
- Critical urgency (5) adds significant boost (+2.0)
- Lower effort increases priority (inverted contribution)
- Impact weighted most (35%), then Urgency/Relevance (25% each)

See [PRIORITY.md](PRIORITY.md) for detailed formula documentation.

---

## Workflow Examples

### Example 1: Daily Task Management

```bash
# 1. Create a work queue
QUEUE_ID=$(curl -X POST http://localhost:3000/api/queues \
  -H "Content-Type: application/json" \
  -d '{"name": "Today"}' | jq -r '.id')

# 2. Add several tasks
curl -X POST http://localhost:3000/api/queues/$QUEUE_ID/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Review PRs", "impact": 3, "urgency": 4, "relevance": 4, "effort": 2}'

curl -X POST http://localhost:3000/api/queues/$QUEUE_ID/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Fix prod bug", "impact": 5, "urgency": 5, "relevance": 5, "effort": 2}'

curl -X POST http://localhost:3000/api/queues/$QUEUE_ID/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Update docs", "impact": 2, "urgency": 2, "relevance": 3, "effort": 3}'

# 3. Get your active task (highest priority)
ACTIVE_TASK=$(curl http://localhost:3000/api/queues/$QUEUE_ID/tasks/next)
echo $ACTIVE_TASK | jq '.title'
# Output: "Fix prod bug" (highest priority due to critical urgency)

# 4. Complete the task
TASK_ID=$(echo $ACTIVE_TASK | jq -r '.id')
curl -X PATCH http://localhost:3000/api/queues/$QUEUE_ID/tasks/$TASK_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "Done"}'

# 5. Get next task (auto-promoted)
curl http://localhost:3000/api/queues/$QUEUE_ID/tasks/next | jq '.title'
# Output: "Review PRs" (next highest priority)
```

### Example 2: Priority Re-adjustment

```bash
# Task becomes more urgent
curl -X PATCH http://localhost:3000/api/queues/$QUEUE_ID/tasks/$TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"urgency": 5}'

# If this task was Queued and now has higher priority than Active task,
# it will automatically be promoted to Active and the previous Active
# task will be demoted to Queued
```

### Example 3: Multi-Queue Workflow

```bash
# Create separate queues for different contexts
WORK_QUEUE=$(curl -X POST http://localhost:3000/api/queues \
  -H "Content-Type: application/json" \
  -d '{"name": "Work"}' | jq -r '.id')

PERSONAL_QUEUE=$(curl -X POST http://localhost:3000/api/queues \
  -H "Content-Type: application/json" \
  -d '{"name": "Personal"}' | jq -r '.id')

# Add tasks to work queue
curl -X POST http://localhost:3000/api/queues/$WORK_QUEUE/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Finish sprint tasks", "impact": 4, "urgency": 5, "relevance": 5, "effort": 3}'

# Add tasks to personal queue
curl -X POST http://localhost:3000/api/queues/$PERSONAL_QUEUE/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn TypeScript", "impact": 4, "urgency": 2, "relevance": 5, "effort": 4}'

# Each queue maintains its own active task
curl http://localhost:3000/api/queues/$WORK_QUEUE/tasks/next | jq '.title'
# Output: "Finish sprint tasks"

curl http://localhost:3000/api/queues/$PERSONAL_QUEUE/tasks/next | jq '.title'
# Output: "Learn TypeScript"
```

### Example 4: Handling Blocked Tasks

```bash
# Task is blocked waiting for something
curl -X PATCH http://localhost:3000/api/queues/$QUEUE_ID/tasks/$TASK_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "Blocked"}'

# Next task automatically becomes Active

# Later, when unblocked, you can't change status back
# Instead, create a new task or mark as Done and create follow-up
```

---

## Response Time and Performance

- All endpoints respond in < 100ms for typical workloads
- In-memory caching ensures fast reads
- File-based storage is suitable for personal use and small teams
- For high-volume production use, consider implementing a database backend

---

## Version

Current API Version: **1.0.0**

This API follows semantic versioning. Breaking changes will increment the major version.

---

For more information, see:
- [README.md](README.md) - Project overview and setup
- [PRIORITY.md](PRIORITY.md) - Priority calculation details
- [CLAUDE.md](CLAUDE.md) - Development architecture guide
