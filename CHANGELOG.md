# Changelog

## 0.1.0 (2026-11-04)

First release.

- Seven agent skills: `node-craft` (core working rules and TDD), `node-craft-init`, `node-craft-arch`,
  `node-craft-contract`, `node-craft-fix`, `node-craft-perf`, `node-craft-ops`.
- `RULES.md` with 50 rules, each labelled with how it is verified.
- `fixtures/contract-kit`: tested reference code for locale resolution, the error envelope, catalog completeness,
  signed cursors, idempotent writes under concurrency and a transactional outbox, on real PostgreSQL.
- Thirteen task-based eval scenarios with a runner that compares agents with and without the skills.
- Optional rn-craft companion guide and a proposed patch for rn-craft 0.2.0.
- Deployment guidance is platform-neutral (no hosting platform assumed).
- Official sources verified on 2026-11-04.
