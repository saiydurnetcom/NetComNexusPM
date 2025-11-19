# Backend Dockerfile (NestJS)
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8.10.0

WORKDIR /app

# Copy package files and Prisma schema early so postinstall works
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Install dependencies (postinstall will now find schema)
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN pnpm prisma generate

# Copy source code
COPY src ./src
COPY tsconfig.json nest-cli.json ./

# Development stage
FROM base AS development
EXPOSE 3000
CMD ["pnpm", "start:dev"]

# Production build stage
FROM base AS build
RUN pnpm build

# Prune dev dependencies while keeping generated Prisma client
FROM base AS production-deps
RUN npm_config_ignore_scripts=true pnpm prune --prod

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy application manifests
COPY package.json pnpm-lock.yaml ./

# Copy pruned node_modules with generated Prisma client
COPY --from=production-deps /app/node_modules ./node_modules

# Copy Prisma schema (needed for runtime commands like migrate deploy)
COPY prisma ./prisma

# Copy built application
COPY --from=build /app/dist ./dist

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'npx prisma migrate deploy' >> /app/start.sh && \
    echo 'node dist/main' >> /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 3000
CMD ["/app/start.sh"]