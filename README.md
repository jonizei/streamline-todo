# Streamline Todo

A multi-user, priority-based task queue server with multi-queue support. Streamline Todo automatically orders tasks by calculated priority and maintains one "active" task per queue, helping you focus on what matters most.

## Features

- **Multi-User Support** - Secure user authentication with JWT tokens
- **Multi-Queue Architecture** - Organize tasks into separate queues (projects, contexts, teams)
- **Smart Prioritization** - Deadline-based priority calculation with automatic daily recalculation
- **Focus Mode** - Only one active task per queue at a time
- **Auto-Promotion** - Next highest priority task automatically becomes active when current task is completed
- **Dynamic Re-prioritization** - Tasks gain urgency as deadlines approach
- **RESTful API** - Simple HTTP endpoints for all operations
- **Secure** - Password hashing (bcrypt), JWT authentication, rate limiting
- **File-Based Storage** - No database required, data stored as JSON files
- **Docker Ready** - One-command deployment with Docker Compose
- **Type-Safe** - Built with TypeScript and Zod validation
- **Well-Tested** - 417 total tests (233 backend + 184 frontend), 100% pass rate
- **Modern UI** - Angular-based SPA with Tailwind CSS dark theme, optimistic updates

## Quick Start

### Option 1: Docker (Recommended)

The fastest way to get started:

```bash
# Clone the repository
git clone <repository-url>
cd streamline-todo

# Set JWT secret
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env

# Start with Docker Compose
docker compose up -d
```

Access the application at **http://localhost**

See [DOCKER.md](DOCKER.md) for detailed Docker deployment guide.

### Option 2: Local Development

#### Backend Installation

```bash
# Clone the repository
git clone <repository-url>
cd streamline-todo

# Install dependencies
npm install

# Configure environment (copy and edit .env.example)
cp .env.example .env
# Edit .env and set JWT_SECRET to a secure random value

# Start the server
npm run dev
```

The backend server will start at `http://localhost:3000`

#### Frontend Installation (Angular)

```bash
# Navigate to ui directory
cd ui

# Install dependencies
npm install

# Start the development server
npm start
```

The frontend will be available at `http://localhost:4200`

### Basic Usage

#### 1. Register a user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "John Doe"
  }'
```

Response includes a JWT token. Save this token for subsequent requests.

#### 2. Login (if already registered)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

#### 3. Create a queue

```bash
curl -X POST http://localhost:3000/api/queues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "My Projects",
    "description": "Personal projects"
  }'
```

#### 4. Add tasks

```bash
curl -X POST http://localhost:3000/api/queues/{queueId}/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Fix critical bug",
    "impact": 5,
    "urgency": 5,
    "relevance": 5,
    "effort": 2
  }'
```

#### 5. Get your active task (what to work on now)

```bash
curl http://localhost:3000/api/queues/{queueId}/tasks/next \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 6. Mark task as done

```bash
curl -X PATCH http://localhost:3000/api/queues/{queueId}/tasks/{taskId}/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"status": "Done"}'
```

The next highest priority task will automatically become active!

## Authentication

### Registration

New users register with email, password (minimum 8 characters), and optional name. Passwords are hashed using bcrypt before storage.

### Login

Users authenticate with email and password, receiving a JWT token valid for 7 days (configurable via `JWT_EXPIRES_IN`).

### Authorization

All queue and task endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Security Features

- **Password Hashing:** bcrypt with 10 salt rounds
- **JWT Tokens:** Signed tokens with configurable expiry
- **Rate Limiting:** 10 requests per 15 minutes on auth endpoints
- **Security Headers:** helmet middleware for HTTP security
- **Input Validation:** Zod schemas on all inputs
- **Data Isolation:** Users can only access their own queues and tasks

## How It Works

### Priority Calculation

Each task is automatically prioritized using a deadline-based urgency system:

```
Effort_inv = 6 - Effort
Base = Impact × 0.35 + Urgency × 0.25 + Relevance × 0.25 + Effort_inv × 0.15
Urgency Bonus = 2.0 × e^(-0.10 × days_remaining)
Priority = Base + Urgency Bonus
```

**Parameters (1-5 scale):**
- **Impact** - How much value does this task provide?
- **Urgency** - How time-sensitive is it? (determines auto-calculated deadline)
- **Relevance** - How well does it align with your goals?
- **Effort** - How much work is required? (lower effort = higher priority)

**Dynamic Urgency:** Tasks automatically gain urgency as their deadline approaches via exponential decay. A daily recalculation job at 2 AM UTC ensures priorities stay current.

**Auto-Deadlines:** Each urgency level maps to a deadline (e.g., urgency 5 = 3 days, urgency 1 = 60 days). Users can also set custom deadlines.

**Maximum Priority:** 7.0 (overdue task with max impact, relevance, and minimal effort)

See [PRIORITY.md](PRIORITY.md) for detailed formula documentation and examples.

### Task Status Flow

Tasks move through five statuses:

- **Queued** - Waiting in the priority queue
- **Active** - Currently being worked on (only ONE per queue)
- **Done** - Completed successfully
- **Blocked** - Cannot progress due to external dependencies
- **Removed** - Cancelled or no longer relevant

**Key Rules:**
1. Only one task can be `Active` per queue at a time
2. First task in an empty queue is automatically promoted to `Active`
3. When an `Active` task is marked `Done`/`Blocked`/`Removed`, the highest priority `Queued` task is automatically promoted to `Active`
4. If an `Active` task's priority drops below a `Queued` task (due to parameter updates), automatic demotion/promotion occurs
5. Empty queue after completing last task is a valid state (no error)

### Multi-Queue Architecture

Queues are independent containers for tasks owned by users, allowing you to:
- Separate work contexts (Work, Personal, Learning)
- Organize by project or team
- Maintain different active tasks simultaneously
- Keep priorities isolated by context

Each queue maintains its own active task and priority ordering. Users can only access their own queues.

## Architecture

```
Client (HTTP with JWT token)
    ↓
REST API Layer (Express routes with auth middleware)
    ↓
Service Layer (business logic, auth, queue management)
    ↓
Repository Layer (JSON file operations with caching)
    ↓
Storage (data/users/, data/queues/)
```

### Storage Structure

```
data/
├── users/
│   ├── {user-id-1}.json
│   ├── {user-id-2}.json
│   └── ...
└── queues/
    ├── {queue-id-1}/
    │   ├── queue.json          # Includes user_id
    │   └── tasks/
    │       ├── {task-id-1}.json
    │       ├── {task-id-2}.json
    │       └── ...
    └── {queue-id-2}/
        ├── queue.json
        └── tasks/
            └── ...
```

### Technology Stack

- **Runtime:** Node.js v20+
- **Language:** TypeScript
- **Framework:** Express.js
- **Authentication:** JWT (jsonwebtoken) + bcrypt
- **Security:** helmet, express-rate-limit
- **Validation:** Zod
- **Testing:** Vitest + supertest
- **Storage:** JSON files (file system)

## API Endpoints

See [API.md](API.md) for complete API documentation with request/response examples.

### Quick Reference

**Authentication:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user profile (protected)
- `PATCH /api/auth/me` - Update user profile (protected)

**Queues (all protected):**
- `GET /api/queues` - List all queues (user's queues only)
- `POST /api/queues` - Create queue
- `GET /api/queues/:queueId` - Get queue (user must own)
- `PATCH /api/queues/:queueId` - Update queue (user must own)
- `DELETE /api/queues/:queueId` - Delete queue (user must own)

**Tasks (all protected, queue-scoped):**
- `GET /api/queues/:queueId/tasks/next` - Get active task
- `GET /api/queues/:queueId/tasks` - List all tasks
- `POST /api/queues/:queueId/tasks` - Create task
- `GET /api/queues/:queueId/tasks/:taskId` - Get task
- `PATCH /api/queues/:queueId/tasks/:taskId` - Update task
- `PATCH /api/queues/:queueId/tasks/:taskId/status` - Update status

## Configuration

Configuration via environment variables (see `.env.example`):

```bash
# Server port (default: 3000)
PORT=3000

# Data directories (defaults shown)
QUEUES_DIR=data/queues
USERS_DIR=data/users

# JWT Configuration (REQUIRED in production)
# Generate a secure random string: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Environment
NODE_ENV=development
```

**IMPORTANT:** Set a strong, random `JWT_SECRET` in production. Never commit `.env` to version control.

## Development

### Commands

```bash
# Development mode (auto-reload on changes)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Production mode
npm start

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npx tsc --noEmit
```

### Project Structure

```
streamline-todo/
├── src/
│   ├── models/          # TypeScript types and Zod schemas
│   │   ├── user.ts
│   │   ├── queue.ts
│   │   └── task.ts
│   ├── services/        # Business logic
│   │   ├── userService.ts
│   │   ├── queueService.ts
│   │   ├── taskService.ts
│   │   ├── priorityCalc.ts
│   │   ├── priorityRecalculationService.ts
│   │   └── scheduledJobs.ts
│   ├── repositories/    # Data persistence
│   │   ├── userRepository.ts
│   │   ├── queueRepository.ts
│   │   └── taskRepository.ts
│   ├── routes/          # REST API endpoints
│   │   ├── auth.ts
│   │   ├── queues.ts
│   │   └── tasks.ts
│   ├── middleware/      # Express middleware
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   ├── utils/           # Utilities
│   │   ├── password.ts
│   │   └── jwt.ts
│   ├── app.ts          # Express app configuration
│   └── index.ts        # Server entry point
├── ui/                 # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   └── environments/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── tests/              # Test files (233 tests)
│   ├── priorityCalc.test.ts
│   ├── taskService.test.ts
│   ├── userModel.test.ts
│   ├── userRepository.test.ts
│   ├── userService.test.ts
│   ├── authUtils.test.ts
│   ├── authRoutes.test.ts
│   ├── routes.test.ts
│   └── authorization.test.ts
├── scripts/            # Utility scripts
│   └── migrate-to-multiuser.ts
├── data/               # Data storage (auto-created, gitignored)
│   ├── users/
│   └── queues/
├── Dockerfile          # Backend Docker image
├── docker-compose.yml  # Multi-container orchestration
├── .dockerignore
├── .gitignore
├── .env.example        # Environment variable template
├── API.md              # Complete API documentation
├── DOCKER.md           # Docker deployment guide
├── PRIORITY.md         # Priority formula documentation
├── PRIORITY_UI.md      # UI form guidelines
└── README.md           # This file
```

### Running Tests

```bash
# All tests (233 tests)
npm test

# Specific test file
npm test -- tests/routes.test.ts

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage
```

**Current Test Coverage:**
- 8 priority calculation tests
- 30 task service tests
- 21 user model validation tests
- 25 user repository tests
- 14 user service tests
- 16 auth utility tests
- 29 auth API integration tests
- 75 queue/task API integration tests
- 15 multi-user authorization tests
- **Total: 233 tests, 100% pass rate**

## Use Cases

### Personal Task Management
- Create a queue for each life area (Work, Personal, Health, Learning)
- Add tasks with appropriate priority parameters
- Focus on one active task per area at a time
- Securely access your tasks from anywhere

### Team Project Management
- Each team member has their own account
- Create queues for different projects or sprints
- Prioritize tasks based on business impact and urgency
- Automatically surface the most important work

### GTD (Getting Things Done) Workflow
- Create context-based queues (@work, @home, @errands)
- Leverage the single active task to maintain focus
- Use `Blocked` status for tasks waiting on others
- Keep personal productivity data secure

### Multi-Context Workflows
- Maintain separate queues for different clients or projects
- Each queue has its own active task and priority ordering
- Switch contexts without losing focus on what's important

## Deployment

### Production Build

```bash
# Build backend
npm run build

# Build frontend
cd ui && npm run build

# The frontend build output is in ui/dist/ui/
```

### Deployment Options

**Option 1: Docker Compose (Recommended)**

The simplest production deployment:

```bash
# Set environment variables
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env

# Start services
docker compose up -d
```

Access at http://localhost (or configure domain with reverse proxy). See [DOCKER.md](DOCKER.md) for comprehensive Docker deployment guide including:
- Production configuration
- HTTPS setup with Nginx/Traefik
- Backup and restore procedures
- Monitoring and troubleshooting

**Option 2: Separate Servers**

Deploy backend and frontend separately:
- Backend: Any Node.js hosting (Heroku, Railway, AWS, DigitalOcean)
- Frontend: Static hosting (Vercel, Netlify, Cloudflare Pages)
- Configure frontend `apiUrl` to point to backend

**Option 3: Single Server with Nginx**

Serve both from one server using Nginx:

```nginx
server {
  listen 80;
  server_name yourdomain.com;

  # Serve Angular frontend
  root /var/www/streamline-todo/ui/dist/ui;
  index index.html;

  # Frontend routes (SPA)
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Backend API
  location /api/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

**Production Checklist:**
- [ ] Set strong `JWT_SECRET` in backend environment
- [ ] Use HTTPS (Let's Encrypt or cloud provider SSL)
- [ ] Set up data directory backups
- [ ] Configure environment variables properly
- [ ] Test authentication flow end-to-end
- [ ] Monitor logs for errors

For detailed frontend deployment options, see [ui/README.md](ui/README.md).

## Migration

For existing single-user deployments, a migration script is provided:

```bash
# Create a user first, then migrate queues to that user
npx tsx scripts/migrate-to-multiuser.ts <user-id>
```

This adds `user_id` fields to existing queues. See the script for details.

## Roadmap

**Completed:**
- ✅ Web-based UI (Angular with Tailwind CSS)
- ✅ Multi-user authentication
- ✅ Comprehensive test coverage (417 total tests)
- ✅ Optimistic UI updates
- ✅ Production-ready deployment guides
- ✅ Docker support with Docker Compose
- ✅ Deadline-based priority system with automatic recalculation

Potential future enhancements:
- Task dependencies
- Recurring tasks
- Task tags and filtering
- Time tracking
- Due dates with automatic urgency adjustment
- Database backend option (PostgreSQL, SQLite)
- Task history and analytics
- Team/organization accounts
- Task sharing and collaboration
- Webhooks and integrations

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Documentation

- [API.md](API.md) - Complete API reference with authentication
- [PRIORITY.md](PRIORITY.md) - Priority calculation formula and deadline system
- [PRIORITY_UI.md](PRIORITY_UI.md) - User-facing form options and UI guidelines
- [DOCKER.md](DOCKER.md) - Docker deployment guide and best practices
- [ui/README.md](ui/README.md) - Frontend architecture and deployment guide

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

Built with TypeScript, Express, and focused simplicity. Secure by design.
