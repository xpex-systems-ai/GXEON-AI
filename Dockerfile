# 🌑 GXEON AI — Dockerfile v10.0
# Google Cloud Run Optimized — Node.js 20

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies (required for some npm packages)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files first (for better layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Cloud Run requires port 8080
ENV PORT=8080
ENV NODE_ENV=production

# Expose the required port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start the application (Railway optimized)
CMD ["node", "server/index.js"]
