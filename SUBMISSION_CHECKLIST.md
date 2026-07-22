# OpenAI Build Week submission checklist

## Project

- [x] Working production project: https://caseloop-zeta.vercel.app/demo
- [x] Project name: CaseFlow
- [x] Tagline: Think before the room speaks.
- [x] Description and built-with technologies: `DEVPOST.md`
- [x] Public repository: https://github.com/nvmmonsalud/caseloop
- [x] MIT license: `LICENSE`
- [x] README setup instructions, synthetic sample data, major decisions, and Codex/GPT-5.6 contributions
- [x] Core `/feedback` Codex Session ID: `019f79be-d29c-7b32-a329-66e70b3e9b03`

## Demo video

- [x] Final MP4 rendered at 1920×1080 (H.264 video, AAC stereo audio)
- [x] Verified duration below 3:00 — 2:34.069
- [x] Audio explicitly explains what was built
- [x] Audio explicitly explains how Codex contributed
- [x] Audio explicitly explains how GPT-5.6 is used
- [ ] Public YouTube upload completed — `https://youtu.be/4Dwh72aaHRc` currently returns private/login-required to signed-out viewers
- [ ] Uploaded YouTube playback checked with audio enabled as a signed-out viewer
- [x] YouTube URL pasted into Devpost

## Devpost fields that require submitter confirmation

- [x] Selected track/category: Education
- [x] Submitter type confirmed: Individual
- [x] Country of residence confirmed: Japan
- [x] Teammate invitations: not applicable for an individual submission with one author
- [x] Project description refreshed from `DEVPOST.md`
- [x] Repository URL and production demo URL verified in the Devpost project
- [ ] Final status changed from **Draft** to **Submitted**

## Plugin/developer-tool requirement

Not applicable: CaseFlow is a hosted education product, not a plugin or developer tool. Judges have an immediately usable, credential-free route at `/demo`.

## Final release gate

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test` — 66 tests passed
- [x] `npm run test:e2e` — 5 browser acceptance tests passed
- [x] `npm run build`
- [x] Production `/`, `/demo`, and `/login` return HTTP 200
- [x] Public repository reports the MIT license
