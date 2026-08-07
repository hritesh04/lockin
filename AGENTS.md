# AGENTS.md

Adaptive-learning app ("LockIn"). Two halves live in one repo:

- **Frontend** (repo root): Expo SDK 55 / React Native 0.83 / TypeScript (strict), expo-router file-based routing rooted at `src/app/` (`index` dashboard, `auth`, `forgot-password`, `onboarding`, `stats`, `review`, `profile`, `topics/[id]`, `topics/[id]/[lessonId]`, `topics/[id]/session`), Zustand stores in `src/store/` (`auth`, `user`, `topics`, `lessons`, `modules`, `session`, `reviews`, `audio`), axios client in `src/lib/api.ts`. Path alias `@/*` → `src/*`. Design tokens are canonical in `src/theme/tokens.ts`.
- **Backend** (`backend/`): Go 1.25, Fiber v2, pgx v5, goose migrations, Swagger, Gemini (`google.golang.org/genai`) as the only active AI provider.

## Tests & CI

- Go unit tests exist for the SM-2 review scheduler and session streak/commitment logic (`backend/internal/service/*_test.go`) — run with `go test ./...` from `backend/`. There is no frontend test framework.
- CI (`.github/workflows/docker-build.yml`) runs `go vet ./...`, `go test ./...`, `npx tsc --noEmit`, and `npm run lint`, fails if a `.env` file is staged or tracked, then builds/pushes the backend Docker image on `main` for changes under `backend/**`, `src/**`, `package*.json`, `tsconfig.json`, `app.json`, or `.github/**`.

## Commands

Frontend:
- `npm run start` / `npm run web` — dev server. Device testing uses the API URL from the root `.env`: `EXPO_PUBLIC_API_BASE_URL` (currently `http://192.168.0.17:8080`, a LAN address; prod is `https://lockin.acerowl.tech`). `npx expo run:android` / `run:ios` for native; EAS profiles live in `eas.json`.
- `npx tsc --noEmit` — typecheck.
- `npm run lint` — ESLint via `expo lint` (currently 0 errors / 13 warnings, all `react-hooks` + `import/no-named-as-default-member`).

Backend (run from `backend/`):
- `make run` / `make dev` — runs `swag init` first, then the server. **Requires the `swag` CLI installed locally**; otherwise it fails.
- `make build` — also regenerates Swagger; outputs `bin/server`.
- `make build-docker` — cross-compiles a linux/arm64 `main` binary (used by `backend/Dockerfile`).
- `make migrate-up` / `migrate-down` / `migrate-status` — goose migrations against `$DATABASE_URL`.
- `go vet ./...` / `go test ./...` — sanity checks; server reads `backend/.env` via `godotenv` (cwd-sensitive).

## Gotchas

- Server fatals at startup without `GEMINI_API_KEY`, a reachable Postgres at `DATABASE_URL`, or a `JWT_SECRET` ≥ 32 bytes. `config.go` defaults `AI_PROVIDER` to `"openai"` but only `gemini` is implemented; the default branch falls through to Gemini anyway.
- Base schema lives in `backend/migrations/` (`0001_base_schema.sql` = users/topics/modules/lessons/questions/question_options/sessions, `0002_create_review_cards.sql`, `0003_add_user_onboarding_fields.sql`). A fresh DB provisions fully with `make migrate-up`. Goose v3 rejects version `0`, so the prefix must be `0001`+.
- `backend/docs/` (swagger) is **generated** by `swag init` — never hand-edit.
- Auth: tokens are persisted via `expo-secure-store` (localStorage on web) and hydrated in `src/app/_layout.tsx`; the axios client auto-refreshes on 401 by posting to `${API_BASE_URL}/api/v1/auth/refresh` (`src/lib/api.ts`), which matches the backend mount. JWT is HS256-only with `iat/iss/aud/token_type` claims; access tokens last 30 min, refresh 30 days.
- Rate limiting lives in `backend/internal/middleware/ratelimit.go` (`AuthRateLimit` = per-IP on `/auth/*`, `AIRateLimit` = per-user on AI-cost routes: `/topics/assessment`, `/sessions/start`, `/sessions/:id/socratic`, review-card generation).
- `docs/implementation-plan.md` inventories known bugs and planned fixes (auth/IDOR/security, AI prompts, dead code); `docs/` also holds the source reviews it derives from (`code-review.md`, `security-review.md`, `prompt-review.md`, `improvement-plan.md`). Most Phase 0 fixes are already landed (JWT hardening, refresh URL, token persistence, rate limits, goroutine context, secrets hygiene) — read it before touching auth, sessions, or prompt code.
- Repo-local UI skills live in `.agents/skills/` (ui-craft family) — gitignored but installed via `skills-lock.json`; use them for UI work.
- `src/theme/tokens.ts` is the only design-token source (the legacy `src/constants/theme.ts` was deleted).
- `backend/bin/` and `backend/lockin_android_arm64` are gitignored build artifacts — never commit them.
- `app.json` enables `reactCompiler` and `typedRoutes` experiments; `.expo/types` (typed routes) and `expo-env.d.ts` are generated.
- Backend env vars beyond the required ones: `PORT`, `CORS_ALLOW_ORIGINS`, `SWAGGER_ENABLED=true` (serves Swagger UI at `/docs/*`).
