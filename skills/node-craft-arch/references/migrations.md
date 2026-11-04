# Migrations and schema changes

- Every schema change is a reviewed, versioned migration file in the repository. No automatic schema sync and no
  `db push` against shared environments.
- Never rewrite migration history that has been applied in a shared environment; add a new migration.
- Local and test reset commands refuse to run in production (check `NODE_ENV` and the database host or name before
  doing anything destructive).
- Verify each migration on an empty database and on a database upgraded from the previous schema (CI can do both:
  apply all from zero; restore the previous release's schema and apply the new ones).

## Old and new code at the same time

During a deploy, the old version still serves traffic while the new one starts, and old mobile clients keep calling
for months. A migration must work with the code version before it.

Risky changes go **expand → migrate data → switch code → contract**, each step its own release:

| Change | Expand | Migrate | Switch | Contract |
|---|---|---|---|---|
| Rename column | Add new column, write both | Backfill new from old | Read new | Drop old (later release) |
| Make column `NOT NULL` | Release code that always writes it | Backfill nulls in batches | Add `CHECK (col IS NOT NULL) NOT VALID` (it applies to new writes at once, so only after the code release) | `VALIDATE CONSTRAINT`, then `SET NOT NULL` (uses the validated check, no full scan), then drop the check |
| Split table | Create new table, dual write | Backfill | Read new | Drop old |
| Change type | New column of the new type | Backfill with conversion | Read new | Drop old |

## Large tables

- Estimate lock level and duration before running. `CREATE INDEX CONCURRENTLY` (cannot run inside a transaction;
  give it its own migration that the tool runs without a wrapping transaction), `ADD CONSTRAINT ... NOT VALID` then
  `VALIDATE CONSTRAINT`, adding a column with a constant default is cheap on current versions but a volatile default
  rewrites the table.
- A failed `CREATE INDEX CONCURRENTLY` leaves an `INVALID` index behind; `IF NOT EXISTS` would then keep the broken
  one. Drop it (`DROP INDEX CONCURRENTLY`) before retrying.
- Set `lock_timeout` in migrations so a blocked `ALTER` fails fast instead of queueing every query behind it.
- Backfills run in bounded batches, are observable (progress logged), resumable from where they stopped, and run as a
  separate operation, not inside a long deploy step.

## Release

- Migrations run in one authorized release step (Railway pre-deploy command or a one-off job), never at every replica
  start. Use the migration tool's lock (or a PostgreSQL advisory lock) so two runners cannot race.
- If the migration fails, the new version receives no traffic. The pre-deploy step failing must stop the deploy.
- Rolling back the application does not roll back the database. Each release says which applies: the old code works
  with the new schema (preferred), a forward fix, or a restore.
- Before a change that can lose data (drop, type narrowing, destructive backfill): state the exact impact, confirm a
  recent backup and a tested restore path, and get explicit approval. Never run unapproved destructive operations.
