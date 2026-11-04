# CI/CD gates

Apply the gates that match the change. Every gate's failure stops the pipeline.

1. Install with the pinned Node and Yarn: `yarn install --immutable`.
2. Format check, lint, typecheck.
3. Unit tests.
4. Integration tests on real PostgreSQL (service container or Testcontainers); Redis/BullMQ tests when used.
5. API/E2E and contract tests.
6. Migrations: apply to an empty database, and to a database at the previous release's schema.
7. Consistency: generated OpenAPI matches the committed file; locale catalogs complete; other generated artifacts
   up to date; breaking API changes flagged against the previous release spec.
8. Production build; dependency audit and secret scan (for example `gitleaks`).
9. Staging deploy, health check, smoke tests.
10. Authorized production release, post-release checks and observation.

## Example (GitHub Actions)

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:18
        env: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: app_test }
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U postgres" --health-interval 5s --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/app_test
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with: { node-version-file: .nvmrc }
      - run: npm install -g corepack && corepack enable
      - run: yarn install --immutable
      - run: yarn format:check && yarn lint && yarn typecheck
      - run: yarn test:unit
      - run: yarn db:migrate && yarn test:integration && yarn test:e2e
      - run: yarn openapi:check && yarn i18n:check
      - run: yarn build
```

Pin action versions as your organization requires (tag or commit SHA).

## Rules

- Never disable a test, mark it skipped or ignore an exit code to pass a gate.
- A pre-existing CI failure is documented (issue, note in the PR), not hidden inside an unrelated change.
- Missing services are a failure, not a pass: a test suite that silently skips when PostgreSQL is absent reports
  green for nothing.
- Avoid repeating the whole suite without reason, but do not assume a narrow impact when auth, the database layer,
  shared schemas or locale code changed.
- Before production: migration, auth, authorization and data integrity risks in the change are covered by checks that
  ran.

## Release order with migrations

| Change | Order |
|---|---|
| Additive (new table, nullable column, new index) | Migrate (release step) → deploy code |
| Code stops using a column | Deploy code → later release drops the column |
| Rename or type change | Expand → backfill → switch code → contract, over several releases |

Rolling back code is fast; rolling back schema is not. Prefer migrations the previous code version can run against.
