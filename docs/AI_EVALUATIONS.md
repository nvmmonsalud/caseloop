# CaseFlow AI evaluations

The evaluation harness covers all five CaseFlow AI workflows with synthetic, fictional inputs:

- Socratic coaching
- preparation-brief generation
- anonymous cohort analysis
- discussion planning
- reflection comparison

It follows an offline-first evaluation loop: run deterministic code-based graders on every change, then opt into a bounded live Gateway run only when comparing model or prompt behavior. The default command never calls a model and never spends money.

## Evaluation contracts

Every output must pass its feature Zod schema. Critical graders additionally enforce:

- citations reference only source IDs supplied with the fixture;
- the coach asks an exploratory question and never chooses for the student;
- generated confidence never exceeds the student's committed confidence;
- cohort counts cannot exceed anonymous response counts and outputs contain no email addresses;
- discussion-plan minutes exactly match the requested duration;
- reflection comparisons preserve newly cited post-class evidence;
- no workflow performs high-stakes grading or claims a correct answer.

The suite passes only when:

| Threshold | Required |
|---|---:|
| Per-case check pass rate | 80% |
| Overall check pass rate | 90% |
| Critical check pass rate | 100% |
| Failed fixtures | 0 |

## Offline CI command

```bash
npm run eval:ai
```

Use `npm run eval:ai:json` for machine-readable stdout. To write both formats as artifacts:

```bash
npm run eval:ai -- --output-dir=eval-results
```

Exit codes are CI-friendly:

- `0`: thresholds passed;
- `1`: the suite ran but one or more thresholds failed;
- `2`: configuration or execution prevented a valid run.

Reports contain fixture IDs, scores, sanitized check messages, duration, token usage, and estimated cost. They intentionally omit prompt text, fixture input, generated output, provider response bodies, and credentials.

## Opt-in live Gateway evaluation

Live evaluation is deliberately double-locked. It runs sequentially and performs a worst-case cost/token preflight before the first request.

```bash
export CASEFLOW_EVAL_LIVE=true
export CASEFLOW_EVAL_ALLOW_SPEND=I_UNDERSTAND_THIS_COSTS_MONEY
export CASEFLOW_EVAL_MAX_TOTAL_TOKENS=10000
export CASEFLOW_EVAL_MAX_OUTPUT_TOKENS=1200
export CASEFLOW_EVAL_MAX_COST_USD=0.25

# Supply one server-only authentication method.
export AI_GATEWAY_API_KEY=...
# Or use a fresh VERCEL_OIDC_TOKEN from `vercel env pull`.

npm run eval:ai:live
```

The live runner reuses the production prompts, Zod schemas, grounding validation, model selection, reasoning effort, timeout, and Gateway path. It disables deterministic fallback for the evaluated call so a provider or validation failure cannot appear as a model pass. It stops after the first live generation or budget failure.

Pricing estimates use current list rates for GPT-5.6 Sol, Terra, and Luna and conservatively price all input as uncached. Verify rates before materially raising the cost ceiling. OpenAI recommends comparing quality, completeness, evidence, tokens, latency, and cost on representative tasks; this harness records those measurable fields without persisting content.

All fixtures are synthetic. Do not add real student submissions, names, emails, access tokens, or production exports to this corpus.
