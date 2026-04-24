# Docker Deployment Guide

This guide explains how to run Streamline Todo using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10 or later
- Docker Compose 2.0 or later

Check your installation:
```bash
docker --version
docker compose version
```

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd streamline-todo
```

### 2. Set Environment Variables

Create a `.env` file in the project root:

```bash
# Generate a secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Create .env file
cat > .env <<EOF
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
NODE_ENV=production
EOF
```

**IMPORTANT:** Never commit the `.env` file to version control. It contains sensitive secrets.

### 3. Build and Start Services

```bash
# Build images and start containers
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 4. Access the Application

- **Frontend:** http://localhost
- **Backend API:** http://localhost:3000/api

The frontend automatically proxies API requests to the backend container, so all API calls work seamlessly.

### 5. Create Your First User

Open http://localhost in your browser and click "Register" to create your account.

## Architecture

The Docker Compose setup runs two services:

```
┌─────────────────────────────────────────┐
│  Browser (http://localhost)             │
└─────────────┬───────────────────────────┘
              │
              │ HTTP requests
              ↓
┌─────────────────────────────────────────┐
│  Frontend Container (Nginx)             │
│  - Serves Angular app                   │
│  - Port 80                               │
│  - Proxies /api/* → backend:3000        │
└─────────────┬───────────────────────────┘
              │
              │ Internal network
              ↓
┌─────────────────────────────────────────┐
│  Backend Container (Node.js)            │
│  - Express API server                   │
│  - Port 3000                             │
│  - JWT authentication                   │
│  - Data stored in volume                │
└─────────────┬───────────────────────────┘
              │
              ↓
         [Data Volume]
        ./data/queues/
        ./data/users/
```

## Data Persistence

Task and user data is stored in the `./data` directory on your host machine and mounted into the backend container. This ensures data persists even if containers are removed.

**Data location:**
```
data/
├── users/          # User accounts
│   └── {user-id}.json
└── queues/         # Queues and tasks
    └── {queue-id}/
        ├── queue.json
        └── tasks/
            └── {task-id}.json
```

## Docker Compose Commands

### Start Services

```bash
# Start in detached mode
docker compose up -d

# Start and view logs
docker compose up

# Rebuild images before starting
docker compose up --build
```

### Stop Services

```bash
# Stop containers (keeps data)
docker compose stop

# Stop and remove containers (keeps data volume)
docker compose down

# Stop, remove containers, and delete volumes (DESTROYS DATA)
docker compose down -v
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend

# Last 100 lines
docker compose logs --tail=100
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
```

### Check Status

```bash
# List running containers
docker compose ps

# Health check status
docker inspect streamline-todo-backend --format='{{.State.Health.Status}}'
```

## Environment Variables

Configure the backend service via environment variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | (required) | Secret key for JWT signing (use `openssl rand -base64 32`) |
| `JWT_EXPIRES_IN` | `7d` | JWT token expiry duration |
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `3000` | Backend server port |
| `QUEUES_DIR` | `/app/data/queues` | Queue storage directory (container path) |
| `USERS_DIR` | `/app/data/users` | User storage directory (container path) |

**Example `.env`:**
```bash
JWT_SECRET=supersecretkey1234567890abcdefghij
JWT_EXPIRES_IN=7d
NODE_ENV=production
```

## Production Deployment

### Security Recommendations

1. **Use HTTPS**: Deploy behind a reverse proxy (Nginx, Caddy, Traefik) with SSL/TLS
2. **Strong JWT Secret**: Generate with `openssl rand -base64 32`
3. **Firewall**: Only expose ports 80/443 to public
4. **Regular Backups**: Backup `./data` directory regularly
5. **Update Images**: Rebuild images periodically for security patches

### Reverse Proxy Example (Nginx)

If deploying to a server with a domain:

```nginx
# /etc/nginx/sites-available/streamline-todo
server {
    listen 443 ssl http2;
    server_name todo.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then update `docker-compose.yml` to only expose ports on localhost:

```yaml
services:
  frontend:
    ports:
      - "127.0.0.1:80:80"  # Only accessible from localhost
```

### Using Traefik (Automatic SSL)

Update `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: .
    container_name: streamline-todo-backend
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=${JWT_EXPIRES_IN}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    labels:
      - "traefik.enable=false"

  frontend:
    build: ./ui
    container_name: streamline-todo-frontend
    depends_on:
      - backend
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.streamline.rule=Host(`todo.yourdomain.com`)"
      - "traefik.http.routers.streamline.entrypoints=websecure"
      - "traefik.http.routers.streamline.tls.certresolver=letsencrypt"

  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=your@email.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    restart: unless-stopped
```

## Backup and Restore

### Backup Data

```bash
# Create backup directory
mkdir -p backups

# Backup data with timestamp
tar -czf backups/streamline-todo-$(date +%Y%m%d-%H%M%S).tar.gz data/

# List backups
ls -lh backups/
```

### Restore Data

```bash
# Stop containers
docker compose down

# Extract backup (replaces existing data)
tar -xzf backups/streamline-todo-20260424-120000.tar.gz

# Start containers
docker compose up -d
```

### Automated Backups

Add to crontab (`crontab -e`):

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/streamline-todo && tar -czf backups/backup-$(date +\%Y\%m\%d).tar.gz data/

# Keep only last 30 days
0 3 * * * find /path/to/streamline-todo/backups -name "backup-*.tar.gz" -mtime +30 -delete
```

## Troubleshooting

### Containers Won't Start

```bash
# Check logs for errors
docker compose logs

# Check if ports are already in use
sudo lsof -i :80
sudo lsof -i :3000

# Remove all containers and try again
docker compose down
docker compose up --build
```

### Backend Health Check Failing

```bash
# Check backend logs
docker compose logs backend

# Verify JWT_SECRET is set
docker compose exec backend env | grep JWT_SECRET

# Test backend directly
curl http://localhost:3000/api/queues
```

### Frontend Can't Connect to Backend

```bash
# Verify backend is running
docker compose ps backend

# Check if containers are on same network
docker network inspect streamline-todo_default

# Test API from frontend container
docker compose exec frontend wget -O- http://backend:3000/api/queues
```

### Data Not Persisting

```bash
# Check volume mount
docker compose exec backend ls -la /app/data

# Verify host directory exists and has correct permissions
ls -la ./data
chmod -R 755 ./data
```

### Permission Errors

```bash
# Fix data directory permissions
sudo chown -R $USER:$USER ./data
chmod -R 755 ./data
```

## Development with Docker

For development, you may want to use volume mounts for hot reloading:

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - JWT_SECRET=dev-secret-key
    volumes:
      - ./src:/app/src
      - ./data:/app/data
    command: npm run dev

  frontend:
    build: ./ui
    ports:
      - "4200:4200"
    volumes:
      - ./ui/src:/app/src
    command: npm start
```

Start dev environment:
```bash
docker compose -f docker-compose.dev.yml up
```

## Resource Limits

For production, consider adding resource limits:

```yaml
services:
  backend:
    # ... other config
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  frontend:
    # ... other config
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M
```

## Monitoring

### View Resource Usage

```bash
# Container stats
docker stats

# Specific containers
docker stats streamline-todo-backend streamline-todo-frontend
```

### Health Checks

Both containers include health checks that run every 30 seconds:

```bash
# Check health status
docker compose ps

# Inspect health details
docker inspect streamline-todo-backend | jq '.[0].State.Health'
```

## Updating

### Update Application

```bash
# Pull latest code
git pull

# Rebuild images
docker compose build

# Recreate containers with new images
docker compose up -d

# Remove old images
docker image prune
```

### Update Base Images

```bash
# Pull latest Node and Nginx images
docker compose pull

# Rebuild with --no-cache to ensure fresh build
docker compose build --no-cache

# Restart services
docker compose up -d
```

## Uninstall

```bash
# Stop and remove containers
docker compose down

# Remove images
docker rmi streamline-todo-backend streamline-todo-frontend

# Remove data (CAUTION: This deletes all user data)
rm -rf ./data

# Remove backups (if you want a clean slate)
rm -rf ./backups
```

## Support

For issues with Docker deployment:
1. Check logs: `docker compose logs`
2. Verify environment variables in `.env`
3. Ensure ports 80 and 3000 are available
4. Check Docker and Docker Compose versions
5. Review the troubleshooting section above

For application issues, see [README.md](README.md) and [API.md](API.md).
