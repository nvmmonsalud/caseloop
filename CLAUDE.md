# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

CaseFlow (repo: caseloop) is an AI-native learning workspace for MBA case-method education, built on Next.js 16 (App Router), React 19, Tailwind 4, the Vercel AI SDK (`ai` package), and an InsForge (Postgres BaaS) backend. It has two roles — student and faculty — and a credential-free demo mode that runs entirely on synthetic browser-local data.

## Commands

```bash
npm run dev              # Dev server; open http://localhost:3000/demo (no credentials needed)
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit (strict mode; must pass)
npm test                 # Vitest unit tests (jsdom)
npx vitest run src/lib/analytics.test.ts        # Run a single test file
npx vitest run -t "test name"                   # Run tests matching a name
npm run build            # Next.js production build
npm run eval:ai          # Offline AI eval harness — deterministic, no provider calls, no cost
npm run test:e2e:install # One-time: install Playwright chromium
npm run test:e2e         # Playwright demo + auth-contract projects (self-contained, no credentials)
npm run test:e2e:live    # Live InsForge suite — skips unless six E2E_* env vars are set; never point at production
```

Full pre-PR check: `npm run lint && npm run typecheck && npm test && npm run build`.

The deterministic Playwright suite boots its own servers (demo app on :3100, auth-contract app on :3101, fake InsForge on :3199 via `e2e/support/mock-insforge.mjs`) — no external services or credentials are involved. Vitest excludes `e2e/**`; the `@` alias maps to `src/`.

Database migrations are versioned SQL in `migrations/`, applied with `npx @insforge/cli db migrations up --all`. Backend config lives in `insforge.toml` (review changes with `npx @insforge/cli config plan`).

## Architecture

Detailed docs: `ARCHITECTURE.md`, `docs/AI_EVALUATIONS.md`, `README.md`.

### Mode switches (understand these first)

Two independent env flags define the runtime posture, and most code paths branch on them:

- `DEMO_MODE` — live AI is enabled only when explicitly `false`. Otherwise every AI feature returns deterministic, schema-valid fixture responses.
- `NEXT_PUBLIC_PERSISTENCE_ENABLED` — `false` is the zero-credential demo (all state browser-local, seeded from `src/lib/data.ts`); `true` requires InsForge auth and makes Postgres the source of truth (browser storage becomes only a recovery cache).

### AI layer (server-only)

All model calls happen in server routes — Gateway credentials and prompts never reach client bundles. The single entry point is `src/app/api/ai/[feature]/route.ts`, dispatching to five workflows: socratic coaching, preparation brief, cohort analysis, discussion planning, and reflection comparison.

- One prompt file per workflow in `src/lib/ai/prompts/`; shared grounding rules in `prompts/shared.ts`.
- Every output is validated against a feature-specific Zod schema in `src/lib/ai/schemas.ts` before rendering. Citations are constrained to `[S1]`–`[S99]` and cross-checked against the sources actually supplied to the request.
- `src/lib/ai/service.ts` orchestrates model calls via the Vercel AI SDK + AI Gateway; `src/lib/ai/fallbacks.ts` provides shape-compatible deterministic fallbacks used in demo mode and (with `AI_FALLBACK_ON_ERROR=true`) on provider/validation failure, marked as `mode: "fallback"`.
- Invariants encoded in prompts, schemas, and the eval harness (`src/lib/ai/evals/`): the coach never chooses the student's recommendation, no automated grading, no identity leakage in cohort outputs, generated confidence never exceeds the student's committed confidence.

### Auth and data

- `src/proxy.ts` (Next 16's replacement for middleware) refreshes InsForge sessions via `@insforge/sdk/ssr` and gates `/student/*` and `/faculty/*` routes. Refresh tokens are httpOnly cookies; no tokens go in browser storage.
- InsForge access is wrapped in `src/lib/insforge/` (`client.ts` browser, `server.ts` SSR, plus `persistence.ts`, `faculty.ts`, `pilot.ts`, `case-materials.ts`). Student writes go through narrow authenticated RPCs; RLS enforces owner isolation.
- **Cohort anonymity is a hard boundary:** faculty analytics flow only through the `get_caseflow_cohort_summary` RPC, which releases aggregates only when the course cohort threshold (≥5, non-configurable below 5) is met and returns only `{ suppressed: true, minimumCohortSize }` below it. The faculty DAL strictly validates both shapes and fails closed on any unexpected identity, raw-response, or brief field. Don't add faculty read paths that bypass this RPC.
- Faculty file ingestion (`src/lib/ingestion.ts`, `src/app/api/faculty/case-materials/route.ts`): 4 MB limit, extension/MIME/magic-byte agreement, macro/active-PDF rejection, private `case-materials` bucket, pending-review quarantine before students can see extracted text.
- Publication boundaries: rubrics and shared feedback are faculty drafts until explicitly released; uploaded material is hidden from students until approved.

### Frontend

Role-specific App Router surfaces under `src/app/{demo,student,faculty,login}`; shared components in `src/components/`. Synthetic demo seed in `src/lib/data.ts`; faculty metric derivation in `src/lib/analytics.ts` and `src/lib/faculty-analytics.ts`.

## Conventions

- TypeScript strict; no `any` (use `unknown` and narrow), prefer types over interfaces for props.
- Every new AI output needs a Zod schema, a deterministic fallback, and eval coverage; every new user-facing flow needs an E2E test that passes without external services.
- All demo/fixture/test data must be synthetic — never add real names, emails, student submissions, or credentials.
- Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`); branches named `feat/…`, `fix/…`, etc.
