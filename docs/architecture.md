# Package architecture

How the node-craft repository is built. This is about the skill package, not about the backends the skills help
build (for that, see `node-craft-init` → `references/structure.md`).

## Findings that shaped the design

The design started from a review of rn-craft at commit `949cb6a` (0.2.0) and the 34-section backend requirements.

| Finding | Decision |
|---|---|
| rn-craft splits work by task (build, fix, perf, init, arch) and loads detail from `references/` on demand | Seven task-based skills, each with a short `SKILL.md` and a table that says which reference to open for which area |
| rn-craft lets the project's own files win (`DESIGN.md`, `STACK.md`) | Every node-craft skill reads `AGENTS.md`, `CLAUDE.md`, `STACK.md`, ADRs and existing code first |
| rn-craft ships 21 lint rules because many UI mistakes are visible in syntax | Backend failures that matter (transactions, tenant filters, idempotency, webhook order) are not provable from syntax. No lint plugin in v0.1; `RULES.md` labels each rule `lint`, `test`, `contract`, `measurement` or `review`, and `lint` only names existing ESLint/TypeScript rules |
| Skill installers copy skill folders one by one | No skill links outside its own folder. Shared rules live in the `node-craft` core skill and others refer to it **by name** (`node-craft` → `references/workflow-tdd.md`). The integrity test rejects `../` links from skill files |
| Hosting differs from team to team | No platform is assumed. `node-craft-ops` describes the pieces every platform has (build, start, release step, health checks, grace period, networking, storage) and asks the agent to map them for the chosen platform in `STACK.md` |
| Optional services must stay optional | Redis, BullMQ, outbox, Firebase, FCM, Adapty and object storage are written as conditional sections, and evals check that a plain API gets none of them |
| rn-craft compatibility must not become a dependency | The client contract is framework-neutral (`node-craft-contract`); rn-craft specifics live in `docs/compatibility/rn-craft.md`, outside the skills |
| Versions and platform facts change | Skills state policies; dated observations live in `sources.md` files |

## Skills

| Skill | Owns | Does not own |
|---|---|---|
| `node-craft` | Working method, TDD, test preservation, done, reporting, routing | Technical detail of any area |
| `node-craft-init` | Intake, versions, framework and ORM decisions, toolchain, environments, layout, project docs | Changing an existing project's stack |
| `node-craft-arch` | Modules, data model, transactions, auth, security, i18n, cache, queues, outbox, notifications, webhooks, files, logs | HTTP contract shape, deployment |
| `node-craft-contract` | REST, OpenAPI, validation, errors, locale header, pagination, idempotency keys, auth outcomes, versioning, client integration | Client UI and storage decisions |
| `node-craft-fix` | Reproduce, regression test, smallest fix, proof | Unrequested refactors |
| `node-craft-perf` | Budgets, measurement, queries, pool, event loop, load tests | Speed claims without numbers |
| `node-craft-ops` | Deployment on any platform, CI gates, health, shutdown, backups, runbooks | Starting paid resources or production releases on its own |

TDD is not a separate skill: it is in the core skill, which every other skill points to.

## Two kinds of tests

| Layer | What it checks | Needs |
|---|---|---|
| `tests/` (`npm test`) | The package: frontmatter, unique names, links and anchors, no cross-skill paths, README skill lists, `RULES.md` fields, eval scenario format, 34/34 coverage rows | Node only |
| `fixtures/contract-kit` (`yarn test`) | Reference code that the skills quote: locale resolution, error envelope, catalog completeness, cursor signing, idempotent writes under concurrency, transactional outbox with competing dispatchers, Fastify routes with validation and tenant isolation | PostgreSQL via Testcontainers |
| `evals/` (`npm run evals`) | Whether an agent with the skills makes the expected decisions, compared with the same agent without them | Claude Code CLI, costs money |

The integrity tests prove the package is well formed, not that the advice is good. The contract kit proves the
quoted code works. The evals are the closest check of the advice itself, and they are graded by a model, so they are
evidence, not proof.

## Repository layout

```text
skills/<name>/SKILL.md, references/   the product
RULES.md                              all rules with verification kinds
docs/                                 architecture, coverage matrix, validation record, rn-craft companion
tests/                                package integrity tests (zero dependencies)
fixtures/contract-kit/                tested reference code (Yarn 4, own lockfile)
evals/                                scenarios, runner, fixtures, results
```
