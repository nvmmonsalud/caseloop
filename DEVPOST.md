# CaseFlow

**Tagline:** Think before the room speaks.

## Inspiration

Case-method learning depends on students forming a view under uncertainty. Yet preparation often collapses into summaries, while faculty scan repetitive submissions without a clear picture of where the room agrees, overreaches, or overlooks evidence.

## What it does

CaseFlow guides a student from an initial recommendation through Socratic pressure-testing, a committed decision, a one-page brief, and post-class reflection. It transforms anonymized cohort reasoning into position distribution, evidence use, misconceptions, representative arguments, and an editable faculty discussion plan.

## How it was built

Next.js 16, React 19, TypeScript, Tailwind CSS, Zod, the official OpenAI SDK and Responses API, plus a Supabase PostgreSQL/Auth/Storage schema and Vercel-ready deployment. A deterministic synthetic demo preserves the complete journey without credentials.

## How Codex was used

Codex served as product-engineering partner across architecture, UX, seed design, implementation, testing, safeguards, and submission documentation. It helped keep the broad idea focused on one complete learning loop.

## How GPT-5.6 is used inside the product

Five narrow server-side contracts power the Socratic coach, preparation brief, cohort analyzer, discussion planner, and reflection comparison. Each uses source identifiers, a dedicated prompt, Zod-validated structured output, and explicit inference/assumption boundaries.

## Challenges encountered

The hardest problem was preventing AI from becoming an answer machine. CaseFlow requires student commitment, asks before telling, preserves uncertainty, and only then synthesizes. A second challenge was making a credential-free demo honest: all faculty analytics are derived from 12 visible synthetic records.

## Accomplishments

- Complete student-to-faculty workflow, not a chatbot showcase
- Derived cohort analytics and editable teaching plan
- Reliable demo fallback with production AI seams
- Source-grounded output and academic-integrity safeguards
- Responsive graduate-school product experience

## What was learned

AI is most useful in education when it changes the learning activity. It should remember commitment, expose assumptions, aggregate disagreement, and help faculty orchestrate the room—not merely answer faster.

## What comes next

Live persistence and auth, secure ingestion, faculty-controlled rubrics and releases, LMS integration, institutional controls, and longitudinal reasoning development.

## Education-category positioning

CaseFlow can improve evidence coverage and reasoning quality before class while reducing faculty synthesis time. It is a narrow wedge toward an AI-native LMS organized around learning loops rather than content containers.
