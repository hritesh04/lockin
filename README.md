# LockIn

Adaptive-learning app. Create or assess a topic, get an AI-generated tiered
roadmap of modules and lessons, practice with retrieval-style quiz sessions,
and lock in knowledge with spaced-repetition review cards (SM-2). AI content
generation is powered by Gemini.

Two halves live in one repo:

- **Frontend** (repo root) — Expo SDK 55 / React Native 0.83 / TypeScript
  (strict). expo-router file-based routing rooted at `src/app/`, Zustand
  stores in `src/store/`, typed axios API client in `src/lib/api.ts`.
- **Backend** (`backend/`) — Go 1.25 / Fiber v2 / pgx v5 / goose migrations /
  Swagger. Gemini is the only active AI provider.

## Features

- **Auth** — email/password signup and login with JWT access + refresh
  tokens, token persistence via `expo-secure-store`, automatic refresh on
  401, forgot-password flow, per-IP rate limiting on `/auth/*`.
- **Onboarding** — pick a goal and daily commitment; streaks reward meeting
  that commitment each day.
- **Topics & roadmaps** — AI-generated tiered roadmaps (modules → lessons)
  with realtime generation status.
- **Assessment** — placement via AI assessment
  (beginner/intermediate/advanced → tier 1–10), including create-a-topic from
  an assessment workflow.
- **Sessions** — adaptive quiz sessions (MCQ, true/false, fill-in-the-blank,
  short answer) with confidence tracking and Socratic follow-ups.
- **Review** — spaced-repetition review cards: due queue, SM-2 rating,
  retention stats, and per-topic retention charts.

## Project structure

- `src/app/` — routes: `auth`, `forgot-password`, `onboarding`, `index`
  (dashboard), `stats`, `review`, `profile`, `topics/[id]`,
  `topics/[id]/[lessonId]`, `topics/[id]/session`.
- `src/store/` — Zustand stores (`auth`, `user`, `topics`, `lessons`,
  `modules`, `session`, `reviews`, `audio`).
- `src/theme/tokens.ts` — canonical design tokens (color, spacing, type,
  radius, shadow).
- `src/lib/api.ts` — typed axios client + token-refresh interceptor.
- `backend/cmd/server/` — entrypoint and Swagger-annotated route wiring.
- `backend/internal/` — `ai` (Gemini client + prompts), `config`, `db`,
  `handlers`, `lib` (JWT), `middleware` (auth, rate limiting), `models`,
  `repository`, `service`.
- `backend/migrations/` — goose schema migrations (base schema, review cards,
  onboarding fields).
- `docs/` — code/security/prompt/improvement reviews and the consolidated
  `implementation-plan.md` (known bugs + planned fixes).

## Getting started

### Frontend

From the repo root:

```bash
npm install
cp .env.example .env   # or create .env with EXPO_PUBLIC_API_BASE_URL
npm run start          # or: npm run web / npx expo run:android
```

`EXPO_PUBLIC_API_BASE_URL` points the app at the API (a LAN address in dev,
`https://lockin.acerowl.tech` in prod; the prod URL is also baked into
`eas.json` for EAS builds).

### Backend

From `backend/`:

```bash
cp .env.example .env   # set DATABASE_URL, GEMINI_API_KEY, JWT_SECRET
make migrate-up
make run               # requires the `swag` CLI; regenerates Swagger first
```

The server exposes an API under `/api/v1` and Swagger UI at `/docs` when
`SWAGGER_ENABLED=true`. Required env vars: `DATABASE_URL`, `GEMINI_API_KEY`,
and `JWT_SECRET` (≥ 32 bytes). Optional: `PORT`, `AI_PROVIDER`,
`CORS_ALLOW_ORIGINS`, `SWAGGER_ENABLED`.

## Tests & CI

- **Backend:** `go test ./...` — unit tests for the SM-2 review scheduler and
  session streak/commitment logic. `go vet ./...` for static checks.
- **Frontend:** `npx tsc --noEmit` and `npm run lint`.
- **CI** (`.github/workflows/docker-build.yml`): runs `go vet`, `go test`,
  `tsc --noEmit`, and `npm run lint`, refuses to build if any `.env` file is
  staged or tracked, then builds/pushes the backend Docker image to Docker
  Hub on `main`.

## Non-goals

LockIn deliberately does not pursue the following, as they are outside the
product's learning model:

- **Learning-styles VAK** — no visual/auditory/kinesthetic learner profiling or
  modality-based content routing. Content is adaptive to measured performance
  (tier, retention), not self-reported learning style.
- **Brain-training games** — no gamified micro-games (reaction drills,
  memory-card mini-games, etc.). Practice happens through structured
  retrieval sessions and spaced-repetition review.
- **Multitasking rewards** — no rewards for multitasking or parallel sessions.
  Sessions are single-focused, and streak/commitment tracking rewards
  sustained, focused study time.
