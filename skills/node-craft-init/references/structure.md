# Structure and module boundaries

A feature-based modular monolith. This describes the backend you build, not the node-craft repository.

## Layout (Fastify)

```text
src/
  app.ts                 # buildApp(config): registers plugins and modules, no listen()
  server.ts              # loads config, buildApp, listen on all interfaces (host '::') and PORT, shutdown hooks
  worker.ts              # worker entry point when there are jobs
  config/                # env schema and typed config
  shared/
    errors/              # AppError, error codes, HTTP mapping
    i18n/                # locale resolver, catalogs per locale
    db/                  # pool/client lifecycle, transaction helper
    http/                # request id, auth plugin, common schemas (pagination, error)
    logger/              # pino options, redaction paths
  modules/
    orders/
      orders.routes.ts   # HTTP only: schemas, auth hooks, call use cases, map result
      orders.schemas.ts  # request/response schemas
      application/       # use cases: place-order.ts, cancel-order.ts
      domain/            # rules and state transitions, no framework imports
      infrastructure/    # queries, provider adapters
      orders.test.ts / *.int.test.ts
migrations/
test/                    # shared test setup: containers, factories
```

NestJS keeps the same idea with modules: `orders.module.ts`, `orders.controller.ts`, use-case services under
`application/`, domain code without Nest decorators, infrastructure providers injected through tokens.

Monorepos: `apps/api`, `apps/worker`, `packages/contract` are examples, not requirements. Follow the workspace
that already exists.

## Boundaries

- Route/controller: HTTP input, output, status codes. No business rules, no heavy queries.
- Application (use case): the workflow, the transaction boundary, calls into domain and infrastructure.
- Domain: rules and state transitions as plain TypeScript. Framework objects (`FastifyRequest`, Nest exceptions)
  never enter it. Domain errors are mapped to HTTP centrally.
- Infrastructure: database and external services behind narrow interfaces that tests can replace.
- A module does not query or write another module's tables. It calls that module's use case or a published read
  function.
- Cross-module operations that need one transaction have one named owner (the use case that opens it).
- The same rule is not implemented in a route, a worker and a webhook handler; all three call the same use case.

## SOLID without ceremony

- Apply single responsibility and dependency inversion where there is a real seam: external services, storage, time,
  randomness. Inject them.
- No empty interfaces, base classes or layers added only to look layered. A repository per table is not required;
  a module may query directly in its infrastructure folder.
- Split service classes that collect unrelated responsibilities. Avoid circular imports between modules
  (`madge --circular` or the bundler's check in CI if it becomes a problem).
- No unnecessary `any`, non-null assertions or type casts; every lint suppression carries a reason.
