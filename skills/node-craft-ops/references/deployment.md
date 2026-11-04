# Deployment

node-craft does not assume a platform. The rules below hold on a PaaS (Railway, Render, Fly.io, Heroku and similar),
on containers you run (ECS, Cloud Run, Kubernetes) or on plain VMs. Each platform names these pieces differently:
find the equivalent in its current docs, and write the mapping into `STACK.md` and the deploy runbook.

## Choose and record the platform

The platform is a product decision, like the framework. If the project has one, use it. If not, ask, or pick from the
intake (team skills, budget, region, managed PostgreSQL and Redis needs, compliance) and record an ADR. Then record:

| Piece | What to find in the platform's docs |
|---|---|
| Build | Buildpack or Dockerfile; how it picks the Node and Yarn versions |
| Start | Start command per service (API, worker) |
| Release step | A one-off step that runs before new instances get traffic and stops the deploy on failure (release phase, pre-deploy command, migration job, init job) |
| Port and host | Which port variable it injects; whether private networking uses IPv4, IPv6 or both |
| Health checks | Path, timeout, whether they run only at deploy or continuously |
| Shutdown | Signal sent, grace period before the process is killed, how overlap between old and new instances works |
| Networking | Private network between services, public ingress, TLS termination and proxy hops |
| Storage | Whether local disk survives deploys and restarts; volumes; object storage |
| Database | Managed PostgreSQL version, connection limits, pooler, backups, point-in-time recovery |
| Config | Environment variables and secrets per environment; configuration in code (if the platform has it) |
| Scaling | Replicas, autoscaling, whether idle services sleep or scale to zero |

Platform facts (limits, defaults, prices, config formats) change; check them on the day and date what you write down.

## Services

| Service | Runs | Notes |
|---|---|---|
| api | `node dist/server.js` | Public ingress, health check, one or more instances |
| worker | `node dist/worker.js` | No public ingress; only when there are jobs; must not sleep while queues or schedules must run |
| postgres | Managed or self-run PostgreSQL | Private network only |
| redis | Only when used | Separate instances for cache and queue when their eviction policies differ |

API and worker can build from the same repository and image with different start commands.

## Build

- Node and Yarn versions come from `engines` / `.nvmrc` and `packageManager`, the same as locally and in CI.
- Dockerfile when used: multi-stage, `yarn install --immutable`, build, then a slim runtime stage with production
  dependencies and `dist/`, a non-root user, `NODE_ENV=production`, no `.env` or secrets in any layer.
- The build compiles and packages. It never runs migrations or touches a production database.

## Start

- Listen on the port the platform injects (usually `PORT`) and on all interfaces. Fastify and NestJS on Fastify
  listen on `localhost` by default, which is unreachable in a container: pass the host. `'::'` accepts IPv6 and, on
  Linux, IPv4 too; use it when the private network is IPv6, otherwise `0.0.0.0` is enough.
- On IPv6 or dual-stack private networks, some clients need to be told to resolve both families (for example
  ioredis/BullMQ `family: 0`).
- Production `start` runs compiled code; no watcher, no `tsx`, no dev server.

## Migrations in the release step

- Run the production migration command (`yarn db:migrate`) once per release, in the platform's release step or a
  one-off job, before new instances take traffic. A non-zero exit must stop the deploy.
- Only one service owns that step. If API and worker deploy separately, the other one does not migrate too. The
  migration tool's lock (or a PostgreSQL advisory lock) is a second guard.
- Never at every instance start, never inside the image build.
- Long backfills are separate, resumable operations, not release steps.
- If the platform has no release step, run the migration as a separate CI job against the target environment before
  the deploy job, and stop the pipeline on failure.

## Health checks

- Point the platform's check at `/health/ready` (`references/health-shutdown.md`).
- Many platforms check only during a deploy. Then a continuous uptime check and alerts are separate work; a deploy
  health check is not monitoring.
- If you restrict allowed hosts, allow the platform's health check host.

## Shutdown and instances

- Learn the signal and grace period. Set the app's own shutdown timeout shorter than the grace period, and the grace
  period longer than the longest request or job step.
- Instances share nothing in memory: sessions, locks, rate limits and schedules that must be shared live in
  PostgreSQL or Redis.
- Restart on failure with a bounded retry count, so a crash loop is visible.

## Network and storage

- Put the API, database and Redis in the same region unless a measured need says otherwise; choose the region from
  where users and providers are.
- Private networking for database, Redis and service-to-service calls; public ingress only for the API.
- Behind the platform's proxy, set the framework's trusted proxy to the real hop count so client IPs are correct
  (`node-craft-arch` → `references/security.md`).
- Container disk is ephemeral on most platforms. User files go to object storage; a volume is for a database or a
  deliberately designed store whose deploy, backup and scaling behaviour you have checked.

## Configuration

- Keep build, start, release step, health check and restart settings in versioned configuration when the platform
  supports it, otherwise in the deploy runbook. When a platform changes its configuration format, migrate with a
  reviewed plan, not by hand in the dashboard.
- Variables and secrets per environment in the platform's secret store, scoped to the services that need them.

## Staging and production

- Separate environments with separate databases, Redis, Firebase projects, provider sandboxes and buckets.
- Staging gets real smoke tests and sandbox integration checks before production.
- Never assume high availability, point-in-time recovery or a backup schedule the chosen plan does not provide.
