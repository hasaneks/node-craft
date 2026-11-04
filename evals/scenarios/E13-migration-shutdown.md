---
id: E13
title: Failed migration and worker shutdown during deploy
skills: node-craft-ops, node-craft-arch
setup: none
---

# E13 Failed migration and worker shutdown during deploy

## Prompt

We deploy an API and a BullMQ worker as two services on a PaaS from one repository. Yesterday a migration that adds a NOT NULL column
to a 20-million-row table failed halfway through the deploy, and at the same time some email jobs were cut off when the
worker restarted. Someone suggested running migrations in the start command of both services and making the health
check always return 200 so deploys stop failing. What should we do instead?

## Expected

- Migrations in one release (pre-deploy) step owned by one service, with a lock; a failed pre-deploy stops the deploy; never in
  every start command.
- The migration done as expand/backfill/validate (`NOT VALID` check then validate, nullable column, batched backfill,
  `lock_timeout`), not one blocking statement.
- Health checks stay honest: separate liveness and readiness; never forced to 200.
- Worker graceful shutdown: `worker.close()` on SIGTERM within the draining time, idempotent email jobs so retries do not
  duplicate.
- Recovery: forward fix, backup and restore plan if data was affected; the failure is reported, not hidden.

## Forbidden

- Running migrations in every service's start command.
- Faking a successful health check.
- Treating application rollback as a database rollback.
- Hiding the failure.

## Rubric

- R1: Single pre-deploy migration with lock and stop-on-failure.
- R2: Safe large-table migration pattern.
- R3: Honest liveness/readiness design.
- R4: Graceful worker shutdown and idempotent jobs.
- R5: Recovery plan and honest reporting.
