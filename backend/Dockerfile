# Optional container image for the Yaazh Music backend.
#
# The backend is a stateless modular monolith: run as many replicas as needed
# behind the load balancer. Each replica keeps its own SQLite file; mount the
# DB path on shared storage or configure an external database for a shared DB
# (see deploy/nginx.conf and the scalability notes in the project README).
#
#   docker build -t yaazh-backend .
#   docker run -p 3000:3000 --env-file .env yaazh-backend

# --- Build stage ---
FROM node:20-bookworm-slim AS build
WORKDIR /app

# better-sqlite3 ships prebuilt binaries; fall back to a C++ toolchain if needed.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Runtime stage ---
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# For building the native module if prebuilds are unavailable.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src

# The database and backups live under /app/data; make it a volume so it survives
# container restarts and can be shared/mounted.
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000

# Start with graceful SIGTERM shutdown (lifecycle.shutdown drains on SIGTERM).
CMD ["node", "dist/server.js"]
