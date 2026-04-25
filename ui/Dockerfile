# Frontend Dockerfile for Streamline Todo Angular UI
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Replace production environment with docker environment for API proxy
RUN cp src/environments/environment.docker.ts src/environments/environment.prod.ts

# Build Angular app for production
RUN npm run build -- --configuration production

# Production image with Nginx
FROM nginx:alpine

# Copy built Angular app to Nginx
COPY --from=builder /app/dist/ui/browser /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
