# Validation record

What was checked for version 0.1.0, how, and with what result. Automated checks and manual evaluations are kept
apart. Nothing here was estimated: every number comes from a run on 2026-11-04 on macOS (arm64), Node v26.5.1
(the Active LTS line; the latest patch was 26.13.0 that day), PostgreSQL 18 in containers through Colima.

## Automated checks

| Check | Command | Result |
|---|---|---|
| Package integrity: frontmatter, unique names, description length and trigger text, `SKILL.md` size, every reference named and present, no links outside a skill folder, cross-skill mentions resolve, all relative links and heading anchors resolve, no placeholders, README skill lists, `RULES.md` fields and verification kinds, README rule counts, eval scenario format, 34/34 coverage rows with real links | `npm test` | 305 passed, 0 failed |
| Contract kit typecheck (TypeScript 7, strict) | `yarn typecheck` | passed |
| Contract kit unit tests: locale resolution, `Accept-Language` parsing, error envelope and status mapping, no internal text in 500s, missing-key fallback, catalog completeness, signed cursors | `yarn test:unit` | 25 passed, 0 failed |
| Contract kit integration tests on PostgreSQL 18 (Testcontainers): idempotent order (repeat, five concurrent duplicates, different payload, per-user scope, rollback of order + outbox + key), outbox (same transaction, two competing dispatchers, failure backoff, attempt limit), API (Turkish validation errors, unsupported header with Turkish profile, unknown fields rejected, 401, idempotent replay header, 409 on reused key, cross-user and cross-tenant 404, paging 25 rows, limit and cursor validation), cursor precision across microseconds | `yarn test:integration` | 19 passed, 0 failed |
| rn-craft companion patch applies to the reviewed commit `949cb6a` | `git apply --check` | passed for all four files |

The integrity tests check that the package is well formed. They do not show that the advice is good; the evals below
are the check for that.

### How the contract kit was built

Each behaviour was written test first. The first run against empty stubs failed on assertions (23 of 25 unit tests,
17 of 17 integration tests), not on imports or setup. One unit test was wrong (it rejected the `.` in a cursor, which
is URL-safe) and was corrected with that reason. An independent review then found a real bug the suite had missed:
the cursor was built from a JavaScript `Date`, which drops microseconds, so rows created within one millisecond were
skipped. A regression test reproduced it (7 of 30 rows returned), the fix encodes the database's full-precision text,
and the test now passes. The same review led to an outbox attempt limit (test first) and an explicit `status` column
on idempotency keys.

## Task evals

Thirteen scenarios (`evals/scenarios/E01`–`E13`), run with the Claude Code CLI 2.1.306 in headless mode
(`npm run evals`). Agent model: Claude Sonnet 5.5. Judge model: Claude Sonnet 5.5, blind to the arm.

- **Skills arm:** this repository's skills in the project's `.claude/skills`; two repetitions per scenario.
- **Baseline arm:** no skills; one repetition per scenario.
- Only project settings are loaded, so skills installed for the user do not leak in. E05 gives rn-craft's skills to
  both arms, so the difference isolates node-craft.
- The agent may read files and load skills, but cannot write files, run commands or use the web. It answers with
  decisions, files and key code. These are **decision-level** evals, not end-to-end builds.
- The judge scores each rubric item 0, 1 or 2 against the scenario's expected behaviour and checks every forbidden
  decision.

### Results

Final skill text against the baseline. E01 and E13 come from run `evals/results/2026-11-04-06-39` (after deployment
guidance became platform-neutral and the E13 prompt changed from Railway to a generic PaaS, so its baseline was rerun
too); the other scenarios from `2026-11-04-06-18` (skills) and `2026-11-04-06-07` (baseline):

| Scenario | Baseline | With node-craft (rep 1 / rep 2) | Forbidden decisions |
|---|---:|---:|---|
| E01 Plain API with no client | 57% | 93% / 93% | none |
| E02 Complex roles and admin domain | 50% | 92% / 83% | none |
| E03 Existing backend keeps its decisions | 93% | 93% / 93% | none |
| E04 Next.js client without mobile dependencies | 92% | 100% / 100% | none |
| E05 Together with an rn-craft app | 100% | 100% / 100% | none |
| E06 Turkish and unsupported locales | 100% | 100% / 100% | none |
| E07 The same write delivered twice | 60% | 100% / 100% | none |
| E08 Another tenant's resource | 100% | 100% / 100% | none |
| E09 Out-of-order subscription webhooks | 67% | 100% / 92% | none |
| E10 Language change before a queued notification | 80% | 100% / 100% | none |
| E11 Account switch and an old push token | 90% | 100% / 100% | none |
| E12 Old mobile client and a new API change | 90% | 100% / 100% | none |
| E13 Failed migration and worker shutdown on a PaaS | 90% | 90% / 90% | none |
| **Mean** | **82.2%** | **96.9%** | **0 of 39 runs** |

- Skill use is counted from `Skill` tool calls and, since the last run, also from reads of `.claude/skills/*` files.
  In the E13 rerun the agent read the ops skill files directly (its answer cites the ops
  deployment reference by path), which the earlier counter missed. Where the scenario expected several skills, agents often loaded
  only the specialist one and skipped the core `node-craft` skill, whose key rules the specialist skills repeat.
  Agents often load the specialist skill directly and skip the core `node-craft` skill, whose rules the specialist
  skills repeat where they matter.
- The first skills run on the earlier text (`2026-11-04-06-07`) averaged 95.9%. Its lost points led to two changes:
  "decide outbox and queues per flow, not per project" (E02) and "report a failed release openly" (E13).
- Cost: $7.28 for the first full run (39 runs with judging), $5.36 for the rerun of the skills arm (26 runs), $1.35 for
  the E01/E13 rerun (6 runs).
- Remaining lost points are mostly limits of the eval setup: agents could not reach nodejs.org to verify the Node
  version on the day (E01), could not write ADR files (E02), and did not name the exact test command (E03).

### Limits

Scores come from a model judge on short, single-turn tasks. They show that the skills change decisions in the
expected direction; they are not proof that a full project built with them is correct. Two repetitions are a small
sample. Baselines were already strong where the scenario prompt itself names the risk (E06, E08, and E13, whose prompt spells
out both bad suggestions).

## Manual evaluations

| Evaluation | How | Result |
|---|---|---|
| Existing production backend (dogfood) | The skills were run read-only on a copy of a private NestJS 11 backend (Express adapter, Prisma, pnpm, about 35 modules) with a request to add a paginated "my visitor entries" endpoint. The original repository was not touched | The agent loaded `node-craft` and `node-craft-contract`, kept NestJS on Express, Prisma, pnpm and Jest, kept the project's page/limit pagination instead of node-craft's cursor default and said why, added a missing `id` tie-breaker, and noticed that reusing an existing mapper would expose a staff member's email to residents. Cost $0.41 |
| Independent technical review | A separate agent read every skill, reference, `RULES.md` and the contract kit for factual errors and contradictions | 14 findings, all fixed: cursor precision (fixture bug), `NOT NULL` migration order, `trustProxy: true`, device token upsert on two unique keys, first entitlement event, host binding, Fastify `removeAdditional`, idempotency table status, retryable 409, auth outcome codes, nested redaction paths, outbox parking, status `426`, invalid concurrent index |
| Official sources | A separate agent checked each library and platform fact against official pages | Recorded with dates in `skills/node-craft-init/references/sources.md`, `skills/node-craft-arch/references/sources.md` |

## Not verified

- No backend was built end to end from scratch by an agent with these skills and deployed; the evals stop at decisions
  and key code.
- Deployment guidance is platform-neutral and has not been exercised by a real deployment on any platform.
- Firebase Admin, BullMQ, Redis and Adapty guidance is not exercised by the contract kit; only PostgreSQL behaviour
  is.
- The GitHub Actions workflow is written but has not run yet; it runs on the first push.
- `npx skills add hasaneks/node-craft` cannot be tested until the repository is public.
