# Contributing to CaseFlow

👋 Welcome! Thanks for your interest in making CaseFlow better.

CaseFlow is an AI-native learning workspace for MBA case-method education. It helps students form independent, evidence-grounded judgment before class and helps faculty turn cohort reasoning into a stronger live discussion.

**First time contributing?** Look for issues labeled `good-first-issue` — they're specifically chosen to be approachable for new contributors. Don't hesitate to ask questions in the issue comments or in GitHub Discussions.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Finding Work to Do](#finding-work-to-do)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [How to Submit Changes](#how-to-submit-changes)
- [Questions & Communication](#questions--communication)

---

## Code of Conduct

This project adheres to the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct.html). By participating, you are expected to uphold this code. Please report unacceptable behavior by opening an issue.

---

## Getting Started

### Prerequisites
- **Node.js** 20+ (we recommend using [nvm](https://github.com/nvm-sh/nvm))
- **npm** (comes with Node.js)

### Local setup (demo mode — no API keys needed 🎉)

```bash
# Clone the repo
git clone https://github.com/nvmmonsalud/caseloop.git
cd caseloop

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start the dev server
npm run dev
```

Open `http://localhost:3000/demo`. You'll be in **demo mode** with full synthetic data — no accounts, no API keys, no setup required. Choose **Student (Maya)** or **Faculty (Professor Tanaka)** to explore the app.

### Live AI mode (optional)

If you want to test with live AI generation:

1. Set `DEMO_MODE=false` in `.env.local`
2. Add `AI_GATEWAY_API_KEY=your_openai_key` (or use Vercel AI Gateway OIDC)
3. Restart the dev server

### Running tests

```bash
# Lint
npm run lint

# TypeScript check
npm run typecheck

# Unit tests
npm test

# E2E test installer (one-time)
npm run test:e2e:install

# E2E tests (Playwright)
npm run test:e2e

# Build
npm run build
```

---

## Project Structure

```
caseloop/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   └── lib/
│       ├── ai/              # AI orchestration
│       │   ├── prompts/     # System prompts for each AI workflow
│       │   ├── schemas.ts   # Zod schemas for AI outputs
│       │   └── service.ts   # Model orchestration
│       ├── data.ts          # Synthetic data seed
│       ├── analytics.ts     # Faculty metric derivation
│       └── ...              # Other utilities
├── migrations/              # PostgreSQL migrations
├── e2e/                     # Playwright E2E tests
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
└── public/                  # Static assets
```

---

## Finding Work to Do

### 🟢 Good First Issues (for new contributors)

These issues are intentionally scoped to be approachable:

| Area | Skills needed | Time estimate |
|------|--------------|--------------|
| **Add synthetic case studies** | TypeScript, data modeling | 1–2 hours |
| **Improve simulator presets** | JSON, understanding of SECI model | 1–2 hours |
| **Write unit tests** | Vitest, TypeScript | 1–3 hours |
| **Documentation improvements** | Markdown, English | 30 min–1 hour |
| **UI polish** | CSS, Tailwind, React | 1–3 hours |
| **Accessibility fixes** | a11y standards, ARIA roles | 1–2 hours |

### 🔧 Advanced contributions

| Area | Skills needed | Impact |
|------|--------------|--------|
| **New AI prompt patterns** | Prompt engineering, Zod schemas | New features |
| **New analytics metrics** | TypeScript, aggregation logic | Faculty insights |
| **Database migrations** | SQL, InsForge CLI | Persistence layer |
| **InsForge integration features** | TypeScript, BaaS patterns | Production readiness |
| **Faculty dashboard features** | React, Next.js, analytics | Core UX |
| **AI evaluation harness** | Prompt evaluation, automation | Quality assurance |

### 💡 Can't find something?

Open a [Discussion](https://github.com/nvmmonsalud/caseloop/discussions) or suggest a feature. We're small — your idea could become the next big feature.

---

## Development Workflow

### Branch naming
```
feat/<short-description>     # New feature
fix/<short-description>      # Bug fix
docs/<short-description>     # Documentation
refactor/<short-description> # Code improvement (no behavior change)
test/<short-description>     # Adding or fixing tests
```

### Commit messages (conventional commits)
```
feat: add new student reflection comparison
fix: resolve cohort aggregation threshold bug
docs: update README with new env vars
refactor: extract AI service into separate module
test: add unit test for analytics pipeline
```

### PR process
1. Fork the repo
2. Create a branch from `main`
3. Make your changes
4. Run tests: `npm run lint && npm run typecheck && npm test && npm run build`
5. Push your branch
6. Open a Pull Request with a clear description
7. Wait for review
8. Merge after approval

---

## Code Standards

### TypeScript
- **Strict mode** is enabled — your code must pass `tsc --noEmit`
- Prefer types over interfaces for prop types
- Use `satisfies` for complex type narrowing
- No `any` — use `unknown` and narrow explicitly

### AI outputs
- Every AI-generated output **must** have a Zod schema
- Schema validation happens server-side before rendering
- Always provide a deterministic fallback shape
- Prompts live in `src/lib/ai/prompts/` — one file per workflow

### Security
- **No hardcoded secrets** — use `.env.local` for local dev, Vercel environment variables for production
- Never commit `.env.local`, `.next/`, `node_modules/`
- All AI routes are server-only
- Student data is owner-scoped; faculty insights are anonymized

### Testing expectations
- Unit tests for new logic functions
- E2E tests for new user-facing flows (Playwright)
- Tests should pass without external services (use demo fallback)
- AI evaluation harness covers new prompt patterns

### Accessibility
- All interactive elements must be keyboard-navigable
- Use semantic HTML (buttons for actions, links for navigation)
- Add `aria-label` where visual labels are absent
- Color contrast: WCAG AA minimum

---

## How to Submit Changes

### PR checklist

Before opening a PR, ensure:

```markdown
- [ ] Code follows project style and standards
- [ ] Tests pass locally (`npm run lint && npm test && npm run build`)
- [ ] New code has tests where applicable
- [ ] UI changes include screenshots (before/after)
- [ ] Documentation updated where relevant
- [ ] AI workflow changes include updated Zod schemas and fallbacks
- [ ] No hardcoded secrets or debug logs
```

### PR description template

```markdown
## Description
[What does this PR do? Why?]

## Related Issue
Closes #[issue-number]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactor
- [ ] Test

## Screenshots
[If UI change]

## How Has This Been Tested
[Describe test process]

## Checklist
- [ ] Code follows standards
- [ ] Tests added/updated
- [ ] Self-review completed
```

### Review process
- Maintainer will review within 3–5 business days
- Expect 1–2 rounds of feedback
- Small PRs get reviewed faster (aim for <300 lines)
- We ❤️ well-described changes

---

## Questions & Communication

| Channel | Purpose |
|---------|---------|
| [GitHub Issues](https://github.com/nvmmonsalud/caseloop/issues) | Bug reports, feature requests |
| [GitHub Discussions](https://github.com/nvmmonsalud/caseloop/discussions) | Questions, ideas, community |
| PR comments | Code-specific feedback |

Don't hesitate to ask for help — everyone was a beginner once. 🤙

---

## Recognition

All contributors (with merged PRs) will be added to `CONTRIBUTORS.md` and acknowledged in release notes. We value every contribution, big or small.

---

*Build better case discussions, together. 📚*
