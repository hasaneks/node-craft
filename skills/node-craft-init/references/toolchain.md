# Toolchain

Verify every version on the day you start (`references/sources.md` records what was true when this skill was
written). Pin what you choose.

## Node.js

- New projects use the **Active LTS** line at its latest patch. Not an LTS that has moved to maintenance, not a
  Current or Alpha line. Check nodejs.org's previous releases page and the release schedule.
- Check that the framework, ORM, test runner and SDKs support that line before you commit to it. A library's support
  table can lag a new LTS; if the chosen framework does not yet list the new line, either confirm compatibility by
  running its test suite on it and record that, or stay on the previous LTS until support is listed, and write the
  reason in `STACK.md`.
- Record the version in `engines.node`, `.nvmrc` (or `.node-version`), the CI setup step, and the deploy build
  (buildpacks usually read `engines` / `.nvmrc`; a Dockerfile pins the base image tag).

## Yarn

- Yarn (Berry, current stable major), pinned per project in `packageManager` (`"packageManager": "yarn@4.x.y"`), with
  `yarn.lock` committed. One package manager, one lockfile. Remove stray `package-lock.json` / `pnpm-lock.yaml` in a
  new project.
- Corepack is no longer bundled with Node.js from v25. Install it once per machine and CI image
  (`npm install -g corepack`, then `corepack enable`), or commit Yarn's release with `yarn set version` (it writes
  `yarnPath` in `.yarnrc.yml`). Either way, everyone and every pipeline runs the same Yarn.
- `nodeLinker: node-modules` in `.yarnrc.yml` unless the team has chosen Plug'n'Play and checked every tool with it.
- CI: `yarn install --immutable`. A lockfile change in CI is a failure, not a fix.

## TypeScript

- `strict: true`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` when the team accepts them,
  `noImplicitOverride`, `useUnknownInCatchVariables` (part of strict).
- Module format: choose ESM or CommonJS once, from what the framework, ORM and test runner need, and use it everywhere.
  Some current tools are ESM-only (for example recent Prisma releases), which settles it. With ESM on Node, use
  `"module": "NodeNext"`, `"moduleResolution": "NodeNext"` and explicit `.js` extensions in relative imports, or a
  bundler step that you own.
- `yarn typecheck` runs `tsc --noEmit` on the whole project, tests included.

## Lint and format

- ESLint with `typescript-eslint` type-aware rules (`recommendedTypeChecked`), at least:
  `@typescript-eslint/no-floating-promises`, `no-misused-promises`, `no-explicit-any` (warn with reason),
  `no-non-null-assertion`, `switch-exhaustiveness-check`, `require-await`. Use the built-in and typescript-eslint
  rules; do not rewrite them.
- Prettier for formatting, with `eslint-config-prettier`. `yarn format:check` in CI.
- Every `eslint-disable` carries a reason on the same line.
- In a monorepo with a mobile app, scope backend rules to backend globs (`apps/api/**`) and leave client rules (for
  example rn-craft's visual rules) on client files only.

## Tests

One main runner that fits the stack: Vitest (ESM and TypeScript out of the box) or Jest (common in NestJS projects).
Integration tests start PostgreSQL with Testcontainers or a disposable Compose service.

## Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/server.js",
    "start:worker": "node dist/worker.js",
    "lint": "eslint .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run --project unit",
    "test:integration": "vitest run --project integration",
    "test:e2e": "vitest run --project e2e",
    "test:ci": "yarn lint && yarn typecheck && yarn test:unit && yarn test:integration && yarn test:e2e",
    "db:migrate": "<the ORM's deploy-mode migrate command>",
    "db:seed:dev": "node dist/scripts/seed-dev.js",
    "db:reset:dev": "node dist/scripts/reset-dev.js"
  }
}
```

- Production never runs `dev` or a watcher; `start` runs the compiled output.
- `db:migrate` is the production-safe, non-interactive command of the chosen ORM version (look it up; command names
  change between majors). Seed and reset are development-only and refuse to run when `NODE_ENV=production` or the
  database host is not local or a test container.

## Local services

`compose.yaml` with PostgreSQL (and Redis only when used), same majors as production, data in a named volume, and
`.env.example` pointing at it. Tests do not depend on this compose stack being up; they start their own containers.
