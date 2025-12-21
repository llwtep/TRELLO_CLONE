# ==============================================================================
# Frontend Dockerfile - React Vite Application (Multi-stage Build)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY frontend/ .

# Build arguments for environment configuration
ARG VITE_API_URL=/trello_app/api
ENV VITE_API_URL=${VITE_API_URL}

# Build the application
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production
# ------------------------------------------------------------------------------
FROM nginx:1.25-alpine AS production

# Remove default nginx configuration
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user for security
RUN addgroup -S nginx-app && adduser -S nginx-app -G nginx-app && \
    chown -R nginx-app:nginx-app /usr/share/nginx/html && \
    chown -R nginx-app:nginx-app /var/cache/nginx && \
    chown -R nginx-app:nginx-app /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx-app:nginx-app /var/run/nginx.pid

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
