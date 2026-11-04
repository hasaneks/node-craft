# Sources (verified 2026-11-04)

What the official sources said on the date above. These facts age; check the links again when you start a project
and prefer them over this list.

| Topic | Observed on 2026-11-04 | Source |
|---|---|---|
| Node.js lines | v26 is Active LTS (since 2026-10-28, maintenance from 2027-10-20). v24 and v22 are Maintenance LTS. v27 is Alpha. Production should use Active or Maintenance LTS only | https://nodejs.org/en/about/previous-releases · https://github.com/nodejs/Release |
| Corepack | Not distributed with Node.js from v25; install it from npm | https://nodejs.org/docs/latest-v24.x/api/corepack.html · https://yarnpkg.com/corepack |
| Yarn | Stable major 4; pin with `yarn set version` / `packageManager` | https://yarnpkg.com/getting-started/install |
| Fastify | 5.x stable (6 in alpha). The LTS page listed Node 20 and 22 for v5; newer Node lines not yet listed | https://fastify.dev/docs/latest/Reference/LTS/ |
| NestJS | 12.x; Fastify via `@nestjs/platform-fastify` and `FastifyAdapter`; Fastify listens on `localhost` by default, so pass a host (`0.0.0.0`, or `::` where IPv6 private networking is needed) | https://docs.nestjs.com/techniques/performance |
| Prisma | Stable 7.x. **npm `latest` pointed to an 8.0 release candidate**; pin 7.x explicitly. Prisma 7: driver adapter required (`@prisma/adapter-pg`), `prisma.config.ts`, client generated to a required `output`, ESM, `.env` not auto-loaded, production applies migrations with `migrate deploy`. Prisma 7 docs moved under `/docs/orm/v7/` | https://www.prisma.io/changelog · https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7 · https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production |
| Drizzle | `drizzle-orm` 0.45.x and `drizzle-kit` 0.31.x stable; 1.0 in RC. Kit: `generate`, `migrate`, `push`, `pull`, `check`; push described as for rapid prototyping | https://orm.drizzle.team/docs/kit-overview · https://orm.drizzle.team/docs/migrations |
| PostgreSQL | 18 is the current major | https://www.postgresql.org/support/versioning/ |
| Testcontainers | `testcontainers` / `@testcontainers/postgresql` 12.x, Node ≥ 22.22 | https://node.testcontainers.org/modules/postgresql/ |
| Vitest / Jest | Vitest 5.x (Node ≥ 22.12, ESM first); Jest 30.x | https://vitest.dev/guide/ · https://jestjs.io/docs/getting-started |

Release candidates and alphas above are not defaults. Use the stable line unless the user asks otherwise.
