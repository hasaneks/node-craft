# Prisma or Drizzle

PostgreSQL is the main store. Choose one main data access approach after the intake and record why in an ADR.

## Choose

| Workload | Consider |
|---|---|
| Mostly relational CRUD, a generated typed client, fast onboarding, schema-first modelling | Prisma |
| SQL-shaped queries, complex joins and reporting, fine control of the generated SQL, a thin layer close to `pg` | Drizzle |

Do not choose on "X is always faster". Look at the SQL each one generates for your hottest queries and measure the
real workload (`node-craft-perf`).

## Rules

- One approach per domain. Do not mix ORMs because one query was awkward. Keep needed raw SQL in a narrow, typed,
  parameterized, tested boundary (Prisma `$queryRaw` with tagged templates, Drizzle `sql` templates).
- ORM models are not API models. Define what is read and written per use case and map to response schemas
  (`node-craft-contract`).
- Before relying on it, confirm from the installed version's docs how the ORM handles: migrations, transactions
  (interactive, isolation level), connection pool settings, PostgreSQL types you need (`numeric`, `timestamptz`,
  `jsonb`, arrays, enums), and its behaviour behind a pooler.
- No automatic schema sync in shared environments and no unplanned `db push` in production. Every change is a
  reviewed, versioned migration (`node-craft-arch` → `references/migrations.md`).
- Install a stable release by explicit version. A registry's `latest` tag can point to a release candidate (it did
  for Prisma on the date in `references/sources.md`); check before `yarn add`.
- Check what each CLI command does in the chosen version before scripting it; commands and config files change
  between majors. Production applies migrations with the deploy command only (for example Prisma `migrate deploy`,
  drizzle-kit `migrate`), never the development command that can reset data.

## Record

```markdown
# 0002 Data access

- Need: orders with line items, stock reservations, monthly reports with window functions.
- Options: Prisma; Drizzle.
- Decision: Drizzle with drizzle-kit migrations.
- Reasons: reporting queries need SQL control; team reads SQL comfortably.
- Revisit when: query code becomes mostly simple CRUD and generated-client ergonomics matter more.
```
