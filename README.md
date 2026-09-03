# Yaazh Music

Version: **1.2.0**

A Spotify-style music app (Tamil-first) with a React Native/Expo frontend and a TypeScript + Express + SQLite backend.

## Features

- **Playback** – stream songs, play/pause, next/previous, shuffle, repeat, inline seek bar, and a full-screen player using `expo-audio`.
- **Songs catalog** – loads songs from the backend API with an automatic fallback to the existing GitHub song source, then a small offline demo list.
- **Search** – local song filtering by title/artist plus a backend `/api/search` endpoint.
- **Moods** – mood-based music selection with the ability to create a mood and broadcast it (server-side).
- **Your Library** – liked songs and playlists:
  - Like/unlike songs (synced with the backend when logged in, stored locally otherwise).
  - Create playlists, add/remove songs, and delete playlists.
- **History** – songs you play are recorded server-side when logged in.
- **Authentication** – register, login, and account screen (JWT-based, stored securely via AsyncStorage).

## Architecture

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  frontend/  React Native/    │  REST  │  backend/  Express + TS       │
│  Expo app (JS)               │ ─────▶ │  auth, songs, likes,         │
│  src/{services,store,player} │        │  playlists, history, moods,   │
│  falls back to GitHub/demo   │        │  search, library             │
└─────────────────────────────┘        └──────────────┬───────────────┘
                                                      │ better-sqlite3
                                              ┌───────▼────────┐
                                              │ SQLite (WAL)   │
                                              │ data/yaazh.db  │
                                              └────────────────┘
```

- The **frontend** never breaks when the backend is offline: every service call falls back to local storage, the GitHub JSON source, or built-in demo songs.
- The **backend** caches the GitHub song list into SQLite on first request and refreshes it every 10 minutes; the API then serves the catalog, search, likes, playlists, history, and moods.

## Project structure

```
frontend/
  App.js                  – app entry: providers, tabs, modals
  src/
    components/           – GradientHeader, SongCard, BottomPlayer, BottomTabs, ActionMenu, PlaylistPicker
    screens/              – Home, Search, Library, Mood, Player, Auth
    player/               – PlayerContext, AudioPlayer, QueueManager, playerUtils (expo-audio)
    store/                – MusicContext, PlayerContext state, LibraryContext, AuthContext
    services/             – api, songs, auth, playlists, storage
    constants/            – colors, strings (localization-ready), config (API URL)
    utils/                – helpers
backend/
  src/
    server.ts             – Express app + server bootstrap (separated for tests)
    config/               – env loading, SQLite schema + connection (WAL)
    middleware/           – auth (requireAuth/optionalAuth), zod validation, error handler
    services/             – authService, songService (GitHub sync)
    controllers/          – auth, song, like, playlist, history, mood, artist, album
    routes/               – route modules per resource
    validations/          – zod schemas
    types/                – shared TypeScript types
  tests/server.test.ts    – end-to-end API tests (vitest + supertest)
```

## Setup

Prerequisites: Node.js 20+ (developed on 24), npm.

### Backend

```bash
cd backend
cp .env.example .env      # optionally adjust PORT / JWT_SECRET
npm install
npm run build
npm start                 # http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npx expo start
```

The frontend auto-derives the backend host from the Metro bundler host, so a physical device on the same Wi-Fi can reach `http://<your-machine-ip>:3000`. Set a production channel (`releaseChannel: 'production'`) to switch to the production API URL.

## Environment variables (backend)

| Variable      | Default                 | Description                                  |
| ------------- | ----------------------- | -------------------------------------------- |
| `PORT`        | `3000`                  | HTTP port                                    |
| `JWT_SECRET`  | dev-only random string  | Secret used to sign auth tokens              |
| `JWT_EXPIRES_IN` | `7d`                 | Token lifetime                               |
| `DB_PATH`     | `data/yaazh.db`         | SQLite database file location                |
| `GH_SONGS_URL`| GitHub songs JSON       | Song catalog source URL                      |

## API overview

Base URL: `http://localhost:3000`

Success responses: `{ "success": true, "data": ... }`
Error responses: `{ "success": false, "error": { "code", "message" } }`

| Method | Endpoint                    | Auth   | Description                          |
| ------ | --------------------------- | ------ | ------------------------------------ |
| POST   | `/api/auth/register`        | –      | Register a user                      |
| POST   | `/api/auth/login`           | –      | Login, returns JWT                   |
| GET    | `/api/auth/me`              | Bearer | Current user                         |
| GET    | `/api/songs`                | –      | Song catalog (GitHub-synced)         |
| GET    | `/api/search?q=`            | –      | Search songs/artists/albums          |
| GET    | `/api/artists`              | –      | Artists                              |
| GET    | `/api/artists/:id/songs`    | –      | Songs by artist                      |
| GET    | `/api/albums`               | –      | Albums                               |
| GET    | `/api/albums/:id/songs`     | –      | Songs by album                       |
| POST   | `/api/likes/:songId`        | Bearer | Like a song                          |
| DELETE | `/api/likes/:songId`        | Bearer | Unlike a song                        |
| GET    | `/api/library`              | Bearer | Library: liked songs + playlists     |
| GET    | `/api/playlists`            | Bearer | My playlists                         |
| POST   | `/api/playlists`            | Bearer | Create playlist                      |
| GET    | `/api/playlists/:id`        | Bearer | Playlist detail                      |
| PATCH  | `/api/playlists/:id`        | Bearer | Rename playlist                      |
| DELETE | `/api/playlists/:id`        | Bearer | Delete playlist                      |
| POST   | `/api/playlists/:id/songs`  | Bearer | Add song to playlist                 |
| DELETE | `/api/playlists/:id/songs/:songId` | Bearer | Remove song from playlist       |
| GET    | `/api/history`              | Bearer | Listening history                    |
| POST   | `/api/history`              | Bearer | Record a stream                      |
| DELETE | `/api/history`              | Bearer | Clear history                        |
| GET    | `/api/moods`                | –      | Browse moods                         |
| POST   | `/api/moods`                | Bearer | Create a mood                        |
| GET    | `/health`                   | –      | Liveness check                       |

Authenticate requests with: `Authorization: Bearer <token>`

## Development commands

| Task              | Frontend                     | Backend                  |
| ----------------- | ---------------------------- | ------------------------ |
| Install           | `npm install`                | `npm install`            |
| Dev server        | `npx expo start`             | `npm run dev`            |
| Build             | `npx expo export --platform android` | `npm run build` |
| Lint/typecheck    | –                            | `npm run typecheck`      |
| Tests             | –                            | `npm test`               |
| Start (prod mode) | –                            | `npm start`              |

## Testing

Backend tests use `vitest` + `supertest` (no network dependency; Redis-backed behaviour is tested via mocks, so tests run without a Redis server):

```bash
cd backend
npm test                 # 266 tests
npm run typecheck        # tsc --noEmit
```

Newer tests cover the scalability primitives: Redis cache adapter, distributed
rate-limit store (with memory fallback), the worker manager/queue (retries,
idempotency, dead-lettering), the repository layer, DB backup/restore, concurrent
writes, and instance identity in metrics.

## Database

SQLite (WAL mode) at `backend/data/yaazh.db`, created automatically on first run. Tables: `users`, `artists`, `albums`, `songs`, `playlists`, `playlist_songs`, `likes`, `listening_history`, `moods`. The schema is managed through `backend/src/config/database.ts`.

## Known limitations

- Frontend login screen exists, but the app is fully usable as a guest; likes/playlists/history sync to the backend only after logging in.
- "Share" in the song menu is not yet wired to the device share sheet.
- Artist/Album screens in the Library are placeholders backed by API endpoints.
- Production API URL (`https://api.yaazh-music.com`) and app icons/splash need real assets/domain before release.

## Horizontal scalability (backend)

The backend is a **stateless modular monolith**: any instance can serve any request,
and state that must be shared across the fleet lives in Redis (a distributed cache
and distributed rate-limit counter). Redis is used only as a shared/coordination
layer — **never as the source of truth** — and the API degrades safely to memory-only
mode when Redis is unset or unavailable, so ordinary music browsing never depends on
Redis.

What makes this horizontal-scale-ready:

- **Stateless auth** – JWT issued/verified locally on each instance; no server session store required.
- **Distributed cache** – `RedisCacheAdapter` attached as a shared tier to the in-memory `CacheService` (write-through set, async read-through on miss). Keys are prefixed with `REDIS_KEY_PREFIX`.
- **Distributed rate limiting** – `RedisRateLimitStore` uses a fixed-window Lua `INCR`+`EXPIRE` shared across instances, with an in-memory fallback so Redis downtime never turns into an unlimited-bypass or a crash.
- **Background workers** – `WorkerManager` + `JobQueue`: in-process queue by default, Redis-backed distributed queue when configured, with per-job concurrency, retries, idempotency (`SET NX`), and dead-lettering.
- **Database backup/recovery** – online SQLite `db.backup()` snapshots with integrity check, rotation, and restore, scheduled per `BACKUP_INTERVAL_HOURS`.
- **Observability** – per-instance `instanceId` in logs and `/api/metrics`; p50/p95/p99 latency, distributed/worker/backup counters, Redis and DB latency.
- **Health/readiness** – `/health`, `/ready` (503 + `NOT_READY` when not ready), graceful shutdown that drains HTTP → workers → providers → cache/Redis → DB.

### Env vars to run scaled out

```bash
# Backend (see backend/.env.example for all variables)
REDIS_URL=redis://:<password>@redis.example:6379
REDIS_KEY_PREFIX=yaazh
INSTANCE_ID=api-a           # unique per instance (auto-generated if unset)
TRUST_PROXY=true
TRUST_PROXY_HOP_COUNT=1

WORKER_CONCURRENCY=4
WORKER_POLL_INTERVAL_MS=1000
WORKER_RETRY_MAX=3

BACKUP_DIR=data/backups
BACKUP_RETENTION_DAYS=7
BACKUP_INTERVAL_HOURS=24
```

### Deploying multiple instances

1. Build the image (`backend/Dockerfile`) or run `npm run build && npm start` on several nodes.
2. Point all instances at the same `REDIS_URL` and `REDIS_KEY_PREFIX`.
3. Put them behind the reverse proxy in `backend/deploy/nginx.conf` (`least_conn` across `:3001..:3003`), which preserves real client IPs so rate limiting works fleet-wide.

**Database note:** the app currently uses per-instance SQLite (`better-sqlite3`). For a truly shared database across instances, mount `backend/data` on shared/network storage (the WAL DB is written safely) or swap `runInTransaction` for a serverless/network database — both supported by the repository layer. Instance-agnostic endpoints (`/health`, `/ready`, `/api/metrics`, JWT auth, caching, rate limiting, workers) already work identically on every replica.

### Load testing

```bash
cd backend
npm run dev                     # or npm start
npm run loadtest                # hits http://localhost:3000/health
# Tune it:
BASE_URL=http://localhost:3000 CONCURRENCY=200 DURATION_MS=10000 npm run loadtest
LOAD_RAMP=10,50,100,200,500 BASE_URL=http://localhost:3000 npm run loadtest
```
The harness (no external deps) ramps 10 → 500 concurrent clients and reports RPS, success rate, and p50/p95/p99/max latency per level.