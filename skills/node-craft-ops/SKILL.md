---
name: node-craft-ops
description: "Operations rules for a Node.js/TypeScript backend: deploying on any platform (PaaS, containers or VMs: build, start, a single release step for migrations, port and host binding, private networking, health checks, instances, draining and graceful shutdown, versioned service config), liveness and readiness endpoints, CI/CD quality gates from immutable install to staging smoke test, migration release and rollback strategy, PostgreSQL backup, restore tests, RPO and RTO, and runbooks for alerts, failed jobs, webhook replay and incidents. Use when setting up or changing deployment, CI, health checks, shutdown, backups or runbooks, or preparing a release. Never starts paid resources or a production release on its own."
---

# Ship and run the backend

Follow `node-craft` for the working rules. Writing a deploy configuration is not a request to deploy: creating paid
resources, changing production settings and releasing to production need explicit approval each time.

| Area | Read |
|---|---|
| Choosing and recording the platform, build, start, release step, networking, instances, storage, config | `references/deployment.md` |
| `/health/live`, `/health/ready`, signals, draining, crash handling | `references/health-shutdown.md` |
| CI gates, release flow, migration and rollback order | `references/ci-gates.md` |
| Backups, restore tests, RPO/RTO, data recovery | `references/backup-restore.md` |
| Alerts, failed jobs, webhook replay, incident steps | `references/runbooks.md` |

## Rules that apply everywhere

- **Same versions everywhere:** Node and Yarn from project metadata in local, CI and deploy builds.
- **Build builds; it does not migrate.** Migrations run once per release in a single release step, with a lock; never at
  every replica start; never inside the image build.
- **A failed migration stops the release.** No traffic goes to a version whose migration failed.
- **Stateless processes.** Sessions, locks, rate limits and schedules that must be shared live in PostgreSQL or Redis,
  not in process memory. User files live in object storage.
- **Health checks tell the truth.** Never make a health endpoint return success to get past a deploy.
- **Shutdown is bounded.** Stop accepting work, finish in-flight work within the platform's draining time, close
  connections, exit.
- **Recovery is tested.** A backup that was never restored is a hope. Record restore tests with dates and durations.
- **No platform is assumed.** Use the project's platform, or record the choice in an ADR; map its pieces (release
  step, health checks, grace period, networking) in `STACK.md` (`references/deployment.md`). Platform features,
  limits, prices and config formats change; check the current docs before relying on them.

## Release checklist

1. CI green on the commit (`references/ci-gates.md`).
2. Migration reviewed for lock time and old-code compatibility; backup recent; data-loss risk approved if any.
3. Staging deploy: release-step migration succeeds, health checks pass, smoke tests pass, sandbox integrations checked.
4. Production release with approval; watch errors, latency, queue and outbox lag for the agreed period.
5. Rollback plan known: application rollback, and which applies to the database (old code compatible, forward fix,
   or restore).

When a release or migration fails: stop, report the failure, its impact and the state it left openly, then choose
forward fix or restore (`references/backup-restore.md`). Never hide it by faking health, skipping a gate or rerunning
until it passes.
