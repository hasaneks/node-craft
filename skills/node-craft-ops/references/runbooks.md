# Runbooks

Short, tested steps in `docs/runbooks/`. Each alert links to its runbook and has an owner.

## Template

```markdown
# <Alert or situation>

- Signal: which metric or alert, threshold
- Impact: what users notice
- First checks: dashboards, logs by request id, recent deploys or migrations
- Actions: numbered, safe first (read-only), then changes with who may approve them
- Escalation: who, when
- After: incident note, follow-up issues
```

## Situations to cover (when the system has them)

| Situation | Key steps |
|---|---|
| Error rate or latency spike | Check the last deploy and migration; roll back the app if it correlates; check DB pool, slow queries, provider status |
| Database slow or connections exhausted | Active queries and locks (`pg_stat_activity`), long transactions, pool waits per service; scale workers down before killing queries |
| Failed jobs piling up | Inspect a sample, classify permanent vs transient, fix the cause, retry in controlled batches; never bulk-retry blindly |
| Queue backlog | Producer rate vs consumer throughput, worker health, provider rate limits; scale workers within the DB connection budget |
| Outbox lag | Oldest pending age, dispatcher health, parked messages after max attempts |
| Webhook replay | Find events by provider id and time range; reprocess through the same idempotent handler; or request redelivery from the provider |
| Wrong data deleted | Stop the cause; estimate scope with read-only queries; restore into an isolated database and copy back the affected rows with an approved script |
| Failed migration | Deploy is stopped (pre-deploy failed); read the error; fix forward with a new migration; restore only with approval |
| Provider outage | Confirm on the provider status page; let retries and the outbox hold work; communicate; reconcile after recovery |
| Redis down | Behaviour per use as documented (cache bypass, rate limit fallback, queue producers failing visibly); restore and verify queue settings (`noeviction`) |
| Restore from backup | Follow `references/backup-restore.md`; record times against RPO and RTO |

## Incidents

Write what happened, when, the impact, the cause, and the follow-ups, without blame. Keep secrets and personal data
out of incident notes.
