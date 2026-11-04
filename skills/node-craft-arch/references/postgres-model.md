# PostgreSQL data model

- PostgreSQL is the main persistent store. Use a current stable major that Railway (or the chosen platform)
  supports and that the ORM supports; record it. Never upgrade the database major automatically.
- Design entities, relations and critical rules before writing code. Do not add fields "for later".

## Integrity in the database

- `NOT NULL` for required fields, `UNIQUE` for business keys, `FOREIGN KEY` for relations, `CHECK` for value rules
  (`quantity > 0`, `status IN (...)` or an enum, `ends_at > starts_at`). Validation in the API does not replace them.
- Choose delete behaviour per relation: `RESTRICT` (default for business data), `CASCADE` only for owned children
  that have no meaning alone, archive, or anonymize. A wrong cascade deletes history.
- Soft delete is not a default for every table. When needed, design the filter (every query), unique rules (partial
  unique index `WHERE deleted_at IS NULL`), restore, and real deletion for retention and account deletion together.
- With tenants, unique constraints and foreign keys include the tenant: `UNIQUE (tenant_id, slug)`, and a child's
  `tenant_id` must match its parent's (composite foreign key `(tenant_id, parent_id)` when it matters).

## Types

| Value | Store as | API |
|---|---|---|
| Money | `numeric(p, s)` or integer minor units (`bigint`), plus a `currency` column (ISO 4217) | String decimal (`"12.50"`) or integer minor units, documented |
| Large integers beyond 2^53 | `bigint` | String in JSON; never a JS number |
| Instants | `timestamptz` | ISO 8601 with offset (`2026-11-04T08:30:00Z`) |
| Calendar dates (birthday, due date) | `date` | `YYYY-MM-DD`; not a timestamp |
| User time zone | `text` IANA name (`Europe/Istanbul`) on the profile | String |
| Flexible metadata | `jsonb` | Schema-validated object |
| Status with transitions | enum or `text` + `CHECK` | Enum string; clients tolerate new values |

- Do not hide relational, queried data inside `jsonb` without a reason.
- Never use floating point for money.
- Pick one id format per project (uuid v7 or bigint identity, for example). Unguessable ids are not authorization.

## State transitions

Model allowed transitions in the domain and enforce them in the write (`UPDATE ... SET status = 'shipped' WHERE id =
$1 AND status = 'paid'` and check the row count). Hiding a button in the UI is not enforcement.

## Indexes

- PostgreSQL does not create an index on the referencing column of a foreign key. Add one when you join or filter on
  it, or delete parents (otherwise deletes scan the child table).
- Index for the real filter, join and sort patterns: column order by equality first then range or sort; partial
  indexes for hot subsets; consider write cost. Not every column gets an index; remove unused or duplicate ones with
  evidence (`pg_stat_user_indexes`).
- Indexes come in migrations, reviewed like code (`references/migrations.md`).

## Lifecycle

Record per table: who owns it, retention period, what account deletion does to it (delete, anonymize, keep for a
legal reason), and whether backups make deletion eventual.
