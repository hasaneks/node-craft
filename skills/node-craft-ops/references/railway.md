# Railway

Facts below were checked on 2026-11-04 (sources at the end). Check them again before you rely on them.

## Services

| Service | Start command | Notes |
|---|---|---|
| api | `node dist/server.js` | Public domain, healthcheck, 1+ replicas |
| worker | `node dist/worker.js` | No public domain; only when there are jobs; not allowed to sleep while queues or schedules must run |
| postgres | Railway PostgreSQL | Private network only |
| redis | Railway Redis | Only when used; separate instances for cache and queue when policies differ |

API and worker can build from the same repository and image with different start commands.

## Build

- Railpack (default builder) or a Dockerfile. Pick per project; either way the Node and Yarn versions come from
  `engines`/`.nvmrc` and `packageManager`.
- Dockerfile: multi-stage, `yarn install --immutable`, build, then a slim runtime stage with production dependencies
  and `dist/`, running as a non-root user, no `.env` or secrets in any layer, `NODE_ENV=production`.
- The build compiles and packages. It never runs migrations or touches the production database.

## Start

- Listen on the `PORT` Railway provides and on all interfaces. In Fastify and NestJS the default host is `localhost`,
  which is unreachable in a container: pass the host explicitly. Railway private networks are IPv6-only in older
  environments and dual-stack in newer ones; binding `::` covers both on Linux (it accepts IPv4 too unless
  `ipv6Only` is set). Check the current private networking docs for the environment you deploy to.
- Clients of private services (Redis via ioredis/BullMQ) may need `family: 0` to resolve internal hostnames.
- Production `start` runs compiled code; no watcher, no `tsx`, no dev server.

## Pre-deploy (migrations)

- Set the pre-deploy command to the production migration command (`yarn db:migrate`).
- It runs between build and deploy in a separate container with the service variables and private network; volumes
  are not mounted and file changes do not persist. A non-zero exit stops the deploy (no automatic retry).
- If API and worker are separate services, only one of them owns the pre-deploy migration. The other must not run it
  too. Use the migration tool's lock or a PostgreSQL advisory lock as a second guard.
- Long backfills are not pre-deploy steps; run them as a separate, resumable operation.

## Healthcheck

- Path `/health/ready` (`references/health-shutdown.md`); it must return 2xx once the service can take traffic.
- Railway checks it only during a deploy, from host `healthcheck.railway.app`, with a configurable timeout (default
  300 seconds). It does not monitor the service afterwards: set up uptime checks and alerts separately.
- If you restrict hosts (`allowedHosts`), allow the healthcheck host.

## Shutdown and replicas

- On redeploy, the old deployment gets `SIGTERM`, then `SIGKILL` after the draining time
  (`RAILWAY_DEPLOYMENT_DRAINING_SECONDS`); overlap is configurable (`RAILWAY_DEPLOYMENT_OVERLAP_SECONDS`). Set the
  draining time longer than your longest request or job step, and make the app's own shutdown timeout shorter than it.
- Replicas run the same code; nothing in process memory is shared between them.
- Restart policy: on failure, with a bounded retry count, so a crash loop is visible.

## Regions, network, storage

- Put the API, database and Redis in the same region unless a measured need says otherwise. Choose the region from
  where users and providers are; do not assume one.
- Private networking for database, Redis and service-to-service calls; public domain only for the API.
- Container disk is ephemeral. User files go to object storage. A volume is for a database or a deliberately designed
  store; check its deploy, backup and scaling behaviour in the current docs.

## Configuration in code

- Keep build, start, pre-deploy, healthcheck and restart settings in versioned configuration, or in a runbook when
  the platform cannot express them.
- As of 2026-11-04, Railway's legacy config-as-code files (`railway.json` / `railway.toml`) are deprecated and work
  only until 2026-12-01; the replacement is Infrastructure as Code in `.railway/railway.ts`, with
  `railway config migrate`, `railway config plan` and `railway config apply`. Use the current format from the docs;
  an existing project still on `railway.json` should migrate before the cutoff (plan, review, then apply with
  approval).

## Staging and production

- Separate Railway environments with separate databases, Redis, Firebase projects, provider sandboxes and buckets.
- Staging gets real smoke tests and sandbox integration checks before production.
- Plans, resource limits, backup features and prices are checked on the deploy date; never assume HA, point-in-time
  recovery or a backup schedule that the chosen plan does not provide.

## Sources

- Pre-deploy: https://docs.railway.com/deployments/pre-deploy-command
- Healthchecks: https://docs.railway.com/deployments/healthchecks
- Teardown and draining: https://docs.railway.com/deployments/deployment-teardown
- Private networking: https://docs.railway.com/networking/private-networking/how-it-works
- Library configuration (ioredis `family: 0`): https://docs.railway.com/networking/private-networking/library-configuration
- Config as code (legacy): https://docs.railway.com/reference/config-as-code
- Infrastructure as Code: https://docs.railway.com/infrastructure-as-code
- Volume backups: https://docs.railway.com/volumes/backups
