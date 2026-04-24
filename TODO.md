# Todo Streamline - Implementation Tasks

## Phase 1: Project Setup ✅

- [x] Initialize project with package.json and tsconfig.json
- [x] Install dependencies (express, zod, vitest, supertest, etc.)
- [x] Create directory structure (src/, tests/, data/tasks/)

## Phase 2: Core Components ✅

- [x] Implement data model with types and Zod schemas (src/models/task.ts)
- [x] Implement priority calculation module (src/services/priorityCalc.ts)
- [x] Write unit tests for priority calculation (tests/priorityCalc.test.ts)
- [x] Implement repository layer with JSON file operations and caching (src/repositories/taskRepository.ts)

## Phase 3: Business Logic ✅

- [x] Implement service layer with business logic and queue management (src/services/taskService.ts)
- [x] Write unit tests for task service (tests/taskService.test.ts)

## Phase 4: API Layer ✅

- [x] Implement REST API routes (src/routes/tasks.ts)
- [x] Implement error handling middleware (src/middleware/errorHandler.ts)
- [x] Create Express app configuration (src/app.ts)
- [x] Create server initialization file (src/index.ts)

## Phase 5: Testing & Verification ✅

- [x] Write integration tests for REST API (tests/routes.test.ts)
- [x] Run all tests to verify implementation

## Phase 6: Documentation ✅

- [x] Write service description and overview (README.md)
- [x] Document API endpoints with examples (API.md)
- [x] Write client usage instructions and getting started guide
- [x] Document multi-queue architecture and workflow examples

---

## Phase 7: Multi-User Foundation ✅

- [x] Install new dependencies (bcryptjs, jsonwebtoken, express-rate-limit, helmet)
- [x] Create User model with Zod schemas (src/models/user.ts)
- [x] Create UserRepository with file storage and caching (src/repositories/userRepository.ts)
- [x] Create password hashing utilities (src/utils/password.ts)
- [x] Create JWT generation/verification utilities (src/utils/jwt.ts)
- [x] Write unit tests for User model validation
- [x] Write repository integration tests for UserRepository
- [x] Write unit tests for password and JWT utilities

## Phase 8: Authentication API ✅

- [x] Create UserService (register, login, getUserProfile, updateProfile)
- [x] Create auth routes (src/routes/auth.ts)
  - [x] POST /api/auth/register - User registration
  - [x] POST /api/auth/login - Authentication
  - [x] GET /api/auth/me - Get current user profile
  - [x] PATCH /api/auth/me - Update profile
- [x] Create auth middleware (src/middleware/auth.ts)
- [x] Add security middleware to app.ts (helmet, rate limiting)
- [x] Write service-layer unit tests for UserService
- [x] Write API integration tests for auth endpoints
- [x] Test rate limiting and token validation

## Phase 9: User-Scoped Data ✅

- [x] Update Queue model to add user_id field (src/models/queue.ts)
- [x] Update QueueRepository with user filtering and indexing
- [x] Update QueueService to enforce user ownership
- [x] Update TaskService to verify queue ownership
- [x] Update queue and task routes with authentication middleware
- [x] Create data migration script (scripts/migrate-to-multiuser.ts)
- [x] Update taskService unit tests (30 tests passing)
- [x] Update integration tests with authentication headers
- [x] Write multi-user authorization tests (15 tests in tests/authorization.test.ts)
- [x] Test migration script with sample data

## Phase 10: Protected Routes ✅

- [x] Add auth middleware to queue routes (src/routes/queues.ts)
- [x] Add auth middleware to task routes (src/routes/tasks.ts)
- [x] Update routes to extract req.user.id and pass to services
- [x] Update app.ts to register auth routes
- [x] Update error handler for auth errors (401, 403)
- [x] Write integration tests for authenticated requests
- [x] Write authorization tests (cross-user access attempts)
- [x] Test 401/404 error responses
- [x] Fix test infrastructure race conditions (vitest fileParallelism: false)
- [x] Fix TaskService logic error in promoteNextTask()

## Phase 11: Polish & Documentation ✅

- [x] Add environment configuration (JWT_SECRET, JWT_EXPIRES_IN)
- [x] Update .env.example with new variables
- [x] Update CLAUDE.md with multi-user architecture
- [x] Update README.md with authentication guide
- [x] Update API.md with auth endpoints and requirements (already complete)
- [x] Conduct security audit (password handling, JWT, input validation)
- [x] Create migration guide for existing deployments

---

## Project Status: All Phases Complete! 🎉

**Total Tests:** 233/233 passing (100%)
**Build Status:** ✅ No TypeScript errors
**Production Ready:** ✅ All security measures in place

### Test Breakdown:
- 8 priority calculation tests
- 30 task service tests
- 21 user model validation tests
- 25 user repository tests
- 14 user service tests
- 16 auth utility tests
- 29 auth API integration tests
- 75 queue/task API integration tests
- 15 multi-user authorization tests

---

## Frontend: Angular Implementation

### Phase 1: Project Setup & Core Infrastructure ✅

- [x] Create Angular project (standalone components)
- [x] Install Tailwind CSS and configure dark theme
- [x] Set up project structure (core, features, shared)
- [x] Configure environment variables and API URL
- [x] Install `jwt-decode` for token management

### Phase 2: Authentication System ✅

- [x] Implement TokenService for JWT storage
- [x] Implement AuthService for login/logout and session management
- [x] Create AuthInterceptor for automatic JWT attachment
- [x] Create ErrorInterceptor for handling 401 errors
- [x] Create AuthGuard for route protection
- [x] Develop LoginComponent with reactive form and validation
- [x] Register providers in app.config.ts
- [x] Configure routes with guards

### Phase 3: Dashboard (Queue List) ✅

- [x] Create Queue interfaces and models
- [x] Implement QueueService (GET, POST, PATCH, DELETE)
- [x] Create DashboardComponent container
- [x] Create QueueCardComponent for queue overview
- [x] Create QueueFormComponent for creating/editing queues
- [x] Implement active task preview for each queue card
- [x] Add HeaderComponent with user info and logout
- [x] Implement loading spinner for async operations

### Phase 4: Queue Detail & Task Management ✅

- [x] Create Task interfaces and models
- [x] Implement TaskService (GET, POST, PATCH status)
- [x] Implement PriorityService (mirror backend calculation)
- [x] Create QueueDetailComponent container
- [x] Create ActiveTaskCardComponent for prominent display
- [x] Create TaskListComponent for priority-ordered tasks
- [x] Create TaskFormComponent with priority preview sliders
- [x] Implement status update logic (Done, Blocked, Removed)

### Phase 5: Shared Components & Polish ✅

- [x] Create reusable ConfirmationDialog component
- [x] Create reusable LoadingSpinner component
- [x] Implement RelativeDatePipe for task creation times
- [x] Implement PriorityBadge component/directive
- [x] Implement global ToastService and feedback container
- [x] Refine responsive layouts for mobile
- [x] Add empty state illustrations/messages

### Phase 7: Priority System Refinement ✅

- [x] Merge question-based mapping into core priority documentation
- [x] Refactor task form to use natural language questions instead of sliders
- [x] Remove raw priority numbers and factor scores from all UI components
- [x] Implement explicit choice requirement (null defaults) for priority questions
- [x] Improve task list layout with better spacing and visual hierarchy
- [x] Ensure task form state is correctly reset on creation

---

## Project Status: All Phases Complete! 🎉

**Total System Tests:** 417 passing (100% rate)
**Backend Coverage:** 233 tests
**Frontend Coverage:** 184 tests
**Documentation:** Fully updated across all layers
**Build Status:** ✅ No errors in backend or frontend builds
**Security:** Verified multi-user isolation and JWT-based auth
