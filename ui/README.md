# Streamline Todo - Angular Frontend

A modern, responsive Angular single-page application for the Streamline Todo priority-based task management system.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Styling](#styling)
- [State Management](#state-management)
- [API Integration](#api-integration)
- [Testing](#testing)
- [Build & Deployment](#build--deployment)

## Overview

The Streamline Todo frontend provides an intuitive interface for managing multiple task queues with automatic priority-based ordering. Each queue displays one active task at a time, with remaining tasks queued by calculated priority.

**Key Features:**
- User authentication with JWT tokens
- Multi-queue task management
- Real-time priority calculation preview
- Optimistic UI updates for instant feedback
- Responsive design with dark theme
- Comprehensive error handling and validation

## Technology Stack

- **Framework**: Angular 21.2.7
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS 3.4
- **HTTP Client**: Angular HttpClient with interceptors
- **Testing**: Vitest 4.1
- **Build Tool**: Angular CLI with Vite
- **Icons**: Heroicons (SVG paths)

## Project Structure

```
ui/
├── src/
│   ├── app/
│   │   ├── core/                    # Core services and models
│   │   │   ├── guards/              # Route guards (auth)
│   │   │   ├── interceptors/        # HTTP interceptors (auth, error)
│   │   │   ├── models/              # Core data models (user)
│   │   │   └── services/            # Core services (auth, token, toast)
│   │   ├── features/                # Feature modules
│   │   │   ├── auth/                # Authentication (login component)
│   │   │   ├── dashboard/           # Dashboard (queue cards, queue form)
│   │   │   └── queue/               # Queue detail (task management)
│   │   │       ├── components/      # Task form, list, cards
│   │   │       ├── models/          # Queue and task models
│   │   │       └── services/        # Queue, task, priority services
│   │   ├── shared/                  # Shared components
│   │   │   └── components/          # Modal, confirmation, toast, etc.
│   │   ├── app.component.ts         # Root component
│   │   └── app.routes.ts            # Application routing
│   ├── styles/                      # Global styles
│   └── index.html                   # HTML entry point
├── angular.json                     # Angular CLI configuration
├── tailwind.config.js               # Tailwind CSS configuration
├── tsconfig.json                    # TypeScript configuration
└── package.json                     # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Backend server running on `http://localhost:3000`

### Installation

```bash
cd ui
npm install
```

### Development Server

Start the development server with automatic reloading:

```bash
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/`. The proxy configuration automatically forwards API requests to the backend.

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage
```

### Building for Production

```bash
npm run build
```

Build artifacts are output to `dist/ui/` directory.

## Architecture

### Component Hierarchy

```
AppComponent
├── HeaderComponent (always visible when authenticated)
└── Router Outlet
    ├── LoginComponent (/login)
    ├── DashboardComponent (/dashboard)
    │   ├── QueueCardComponent (multiple)
    │   └── QueueFormComponent (modal)
    └── QueueDetailComponent (/queue/:id)
        ├── ActiveTaskCardComponent
        ├── TaskListComponent
        │   └── TaskCardComponent (multiple)
        └── TaskFormComponent (modal)
```

### Authentication Flow

1. User submits login credentials via `LoginComponent`
2. `AuthService.login()` sends credentials to `/api/auth/login`
3. Backend returns JWT token and user data
4. `TokenService` stores token in localStorage
5. `AuthInterceptor` adds `Authorization: Bearer <token>` to all API requests
6. `AuthGuard` protects routes requiring authentication
7. On token expiry or logout, user is redirected to `/login`

### Data Flow & Optimistic Updates

To minimize UI flicker and improve perceived performance, the application uses optimistic updates:

```typescript
// Creating a task
onSaveTask(request: CreateTaskRequest) {
  this.taskService.createTask(queueId, request).subscribe(task => {
    // Add task to local array instead of refetching all tasks
    this.tasks.push(task);
    this.tasks = this.sortTasks([...this.tasks]);
  });
}
```

This approach eliminates unnecessary API calls and provides instant visual feedback.

## Styling

### Tailwind CSS

The application uses Tailwind CSS with a custom dark theme:

- Primary: Teal/Cyan
- Background: Dark gray
- Responsive: Mobile-first with breakpoints

## State Management

Service-based pattern with RxJS BehaviorSubjects:

```typescript
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
}
```

## API Integration

### Services

- **QueueService**: Queue CRUD operations
- **TaskService**: Task management and status updates
- **PriorityService**: Client-side priority calculation

### Priority Calculation

```typescript
priority = impact * 0.35 + urgency * 0.25 + relevance * 0.25 + 
           effortInverse * 0.15 + (urgency === 5 ? 2.0 : 0)
```

## Testing

- **184 tests** across 14 test files
- **100% pass rate**
- Coverage: Services, components, interceptors

## Build & Deployment

### Production Build

```bash
npm run build
```

Output: `dist/ui/` (~78 KB gzipped)

### Deployment Options

**Nginx:**
```nginx
server {
  listen 80;
  root /var/www/ui/dist/ui;
  
  location / {
    try_files $uri $uri/ /index.html;
  }
  
  location /api/ {
    proxy_pass http://localhost:3000;
  }
}
```

**Docker:**
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=build /app/dist/ui /usr/share/nginx/html
```

## Additional Resources

- [Angular Documentation](https://angular.dev)
- [Backend API Documentation](../CLAUDE.md)
