# Frontend Dockerfile (React + Vite)
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8.10.0

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code (excluding backend)
COPY src ./src
COPY public ./public
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY tailwind.config.ts postcss.config.js components.json ./

# Development stage
FROM base AS development
EXPOSE 5173
CMD ["pnpm", "dev", "--host"]

# Production build stage
FROM base AS build
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm build

# Production stage
FROM nginx:1.25-alpine AS production
COPY docker/nginx-frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]