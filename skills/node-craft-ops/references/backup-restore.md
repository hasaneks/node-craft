# Backup and restore

## Policy

Write down, per environment:

| Item | Example |
|---|---|
| RPO (acceptable data loss window) | 24 hours (daily backups) or minutes (point-in-time recovery) |
| RTO (target time to restore service) | 2 hours |
| Backup method | Platform volume backups; plus a logical `pg_dump` to separate storage when the platform's options do not meet the RPO, retention or location needs |
| Schedule and retention | Daily kept 7 days, weekly kept 4 weeks, monthly kept 3 months |
| Encryption and access | Encrypted at rest; who can read and restore backups |
| Deletion | How long deleted personal data survives in backups; documented for privacy requests |

Managed databases differ: some offer daily snapshots only, some point-in-time recovery, some restore only into a new
instance or the same project. Check what your platform and plan provide on the day; do not assume point-in-time
recovery or high availability.

## Restore tests

- Restore into an isolated environment on a schedule (for example monthly) and after any change to the backup setup.
- Check: the service starts against the restored database, migrations table is consistent, row counts and recent data
  match expectations, the application's smoke tests pass.
- Record date, backup used, duration (compare to RTO), data age (compare to RPO), problems found.

## Consistency across stores

- PostgreSQL is the source of truth. Redis persistence is not a backup of business data.
- Object storage: versioning or its own backup when files matter; know that a database restored to yesterday may
  reference files deleted today (or miss files uploaded since).
- Outbox and queues: after a restore, undispatched outbox rows will be sent again; consumers must be idempotent.
  Jobs in Redis that refer to rows not present in the restored database must fail safely.
- Provider state (payments, subscriptions) after a restore: run reconciliation.

## Before risky operations

Before a destructive migration, a bulk data fix or a major upgrade: take a fresh backup, confirm it completed, know the
restore steps and time, and get approval. Never improvise a data reset during an incident.
