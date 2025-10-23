# Multi-stage build for production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --only=production

# Build stage
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Build the client
WORKDIR /app/client
RUN npm run build

# Build the server
WORKDIR /app/server
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/server/dist ./server/dist
COPY --from=builder --chown=nextjs:nodejs /app/client/dist ./client/dist
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nextjs:nodejs /app/server/node_modules ./server/node_modules

# Copy package files
COPY --chown=nextjs:nodejs package*.json ./
COPY --chown=nextjs:nodejs server/package*.json ./server/

USER nextjs

EXPOSE 3002

ENV NODE_ENV=production
ENV PORT=3002

CMD ["node", "server/dist/index.js"]
