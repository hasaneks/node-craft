# Working in an existing backend

Existing code carries decisions, even when they are not written down. node-craft defaults are for new projects and
for code you are already changing; they are not a migration plan.

## Read before you write

1. `AGENTS.md`, `CLAUDE.md`, `STACK.md`, `docs/adr/`, README, CONTRIBUTING.
2. `package.json` (`packageManager`, `engines`, scripts), the lockfile present (`yarn.lock`, `package-lock.json`,
   `pnpm-lock.yaml`), `.nvmrc` / `.node-version`.
3. The framework entry point (Fastify instance, Nest `main.ts`, Express app), the HTTP adapter in use, the ORM or
   query layer, the migration tool, the auth middleware or guard, the error handler, the logger.
4. The test runner, how tests get a database, and the CI workflow.
5. Run the existing tests and record the result before changing anything.

## Keep

| Decision found | Keep it | Do not |
|---|---|---|
| Express, or NestJS on the Express adapter | Use its middleware model and error handling | Swap to Fastify or the Fastify adapter as part of a feature |
| Prisma, Drizzle, TypeORM, Knex, raw `pg` | Use it for new queries; keep raw SQL in its existing boundary | Add a second ORM for "just this module" |
| npm, pnpm or Yarn with its lockfile | Use that manager and lockfile | Add a second lockfile or switch managers |
| Custom JWT, sessions, Auth0, Clerk, Firebase | Integrate with it | Add Firebase Auth or a second refresh-token system |
| Jest or Vitest | Write tests in it | Add the other runner |
| Its error response shape | Extend it compatibly | Change the wire format clients already parse |
| Its folder layout | Add new code in the same pattern | Reorganize unrelated modules |

## When a default would clearly help

Some gaps are risks, not style: no runtime validation, SQL built from strings, a missing tenant filter, secrets in
logs, migrations run by every replica at boot. Fix these in the code you touch, with a test, and say so.

For bigger shifts (framework, ORM, auth provider, error format, package manager), write a short proposal in the
project's ADR format with: need, options, recommendation, migration cost, risk, and when to revisit. Do not apply it
without approval. A breaking change to the API contract also needs the versioning plan in
`node-craft-contract` → `references/versioning.md`.

## Monorepos and shared files

- Respect the workspace's package manager and Node version; a decision for `apps/api` affects every workspace.
- A shared `STACK.md` may already hold mobile decisions (for example from rn-craft). Keep those sections; add or
  edit only a clearly titled backend section. Never rewrite the whole file. If the API has its own root, keep its own
  `STACK.md` and link the shared decisions.
- In a shared ESLint config, scope backend rules to backend file globs and leave client rules on client files.
