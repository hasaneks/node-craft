# Versioning and backward compatibility

Assume old mobile versions keep calling the API for months. Decide the support window at the start (for example "the
last 3 minor app versions or 180 days, whichever is longer") and write it in `STACK.md`.

## Safe changes (no new version)

- Add an optional request field.
- Add a response field (clients ignore unknown fields: put that rule in the client guide).
- Add an endpoint.
- Add an error code under an existing status (clients fall back on status).
- Add an enum value **only if** clients were told to treat unknown values safely, and the old clients you support
  actually do. Test with a recorded old client response handler.

## Breaking changes

Removing or renaming a field, changing a type or format, making an optional request field required, changing a status
code or error code, narrowing accepted values, changing pagination shape, changing auth.

Do them as a controlled transition:

1. Add the new shape next to the old (new field, new endpoint, or `/api/v2` for a wide change).
2. Ship clients that use the new shape.
3. Watch usage of the old shape (log the app version header, for example `X-App-Version`).
4. Remove the old shape after the support window, announced with `Deprecation` / `Sunset` headers where useful.

A new required field for an old client is a break: give it a server default until the window closes.

## Contract tests

- The committed OpenAPI spec is diffed in CI against the previous release (`oasdiff` or similar) and breaking changes
  fail the build unless the change is labeled and versioned.
- Recorded responses from supported client versions are replayed against the new server in tests.
- Database migrations follow the same window (`node-craft-arch` → `references/migrations.md`): old and new code run
  against the same schema during deploys.
