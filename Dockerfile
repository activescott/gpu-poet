FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
# Canvas native dependencies required for chartjs-node-canvas server-side chart rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies
# Copy all files needed for dependency resolution
COPY . .
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
# Need canvas build deps for the build step (node_modules include native bindings)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    libpixman-1-0 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Use dummy/placeholder database URL for build - the real one will be provided at runtime
ENV POSTGRES_PRISMA_URL=postgresql://dummy:dummy@localhost:5432/dummy
ENV POSTGRES_URL_NON_POOLING=postgresql://dummy:dummy@localhost:5432/dummy

# Generate Prisma client
RUN cd packages/web-app && npx prisma generate

# Build the application using turbo (it will build dependencies first)
RUN npm run build

# Upload browser source maps to PostHog (error tracking), then delete them so
# they are never served. Credentials are BuildKit secrets, never ARG/ENV, so
# they do not end up in image layers. Skips cleanly when they are absent.
RUN --mount=type=secret,id=POSTHOG_PERSONAL_API_KEY \
    --mount=type=secret,id=POSTHOG_PROJECT_ID \
    sh scripts/upload-sourcemaps.sh packages/web-app/.next/static

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Canvas runtime dependencies for chartjs-node-canvas (runtime libs only)
# OpenSSL is required by Prisma for database connections
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    openssl \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    libpixman-1-0 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/packages/web-app/.next ./packages/web-app/.next
COPY --from=builder /app/packages/web-app/public ./packages/web-app/public
COPY --from=builder /app/packages/web-app/package.json ./packages/web-app/package.json
COPY --from=builder /app/packages/web-app/next.config.mjs ./packages/web-app/next.config.mjs

# Set ownership of .next directory to nextjs user for write permissions
RUN chown -R nextjs:nodejs /app/packages/web-app/.next

# Copy pre-generated sitemap (generated with Git info)
COPY --from=builder /app/packages/web-app/src/app/sitemap.static-pages.json ./packages/web-app/src/app/sitemap.static-pages.json

# Copy workspace dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy prisma schema and migrations
COPY --from=builder /app/packages/web-app/prisma ./packages/web-app/prisma

# Copy source files needed for seeding (TypeScript imports)
COPY --from=builder /app/packages/web-app/src ./packages/web-app/src
COPY --from=builder /app/packages/web-app/tsconfig.json ./packages/web-app/tsconfig.json

# Copy data files needed for seeding
COPY --from=builder /app/data ./data

# Validate that required data files exist and are not empty
RUN if [ ! -d "./data/gpu-data" ] || [ -z "$(find ./data/gpu-data -name '*.yaml' -type f)" ]; then \
      echo "ERROR: No GPU data files found in ./data/gpu-data/"; \
      echo "Make sure the data directory is populated"; \
      exit 1; \
    fi && \
    if [ ! -d "./data/benchmark-data" ] || [ -z "$(find ./data/benchmark-data -name '*.yaml' -type f ! -name 'gpu-name-mapping.yaml')" ]; then \
      echo "ERROR: No benchmark data files found in ./data/benchmark-data/"; \
      echo "Make sure the data directory is populated"; \
      exit 1; \
    fi && \
    echo "Data validation passed: GPU and benchmark data files found"

# Copy and set up entrypoint script
COPY --from=builder /app/docker/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "run", "start", "--workspace=packages/web-app"]
