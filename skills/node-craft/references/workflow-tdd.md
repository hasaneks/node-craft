# TDD and protecting existing tests

## The loop

1. **Define.** Write down the behaviour in one or two sentences, the error cases, and the contract it touches
   (endpoint, status codes, error codes, payload, event or job). If the behaviour is unclear, settle it before the
   test; a test cannot fix an undecided rule.
2. **Red.** Write the test that states the behaviour. For a bug, write the test that reproduces the reported failure
   through the same entry point the user hit (HTTP route, job handler, webhook), not through a private helper.
3. **Check the reason.** Run only that test. It must fail on the assertion that describes the missing behaviour.
   These are not Red: module not found, type error in the test, missing env var, container not started, timeout
   while connecting. Fix the harness first, then see the real failure.
4. **Green.** Write the smallest correct implementation. Correct means it respects constraints and transactions; a
   hard-coded return that only satisfies the assertion is not Green.
5. **Run the related tests.** The new test plus the module's existing tests.
6. **Refactor.** Remove duplication, name things, move logic to the right layer. Behaviour stays the same; run the
   affected modules' tests again.
7. **Widen by risk.** Shared code (auth, error mapper, locale resolver, DB access, base schemas) changed → run every
   module that uses it. Queries, constraints, transactions, migrations → integration tests on real PostgreSQL. Jobs →
   worker tests with real Redis when BullMQ is used. Contract → contract tests.

## What to test first

| Layer | Test first |
|---|---|
| Unit | Business rules, decisions, state transitions, locale resolution, error mapping |
| Integration | Real PostgreSQL queries, constraints, transactions, migrations |
| API / E2E | Auth, authorization, validation, HTTP contract, critical user flows |
| Worker | Retry, duplicate job, idempotency, failure, restart |
| Contract | OpenAPI, old client expectations, provider payload mapping |
| Performance | Critical endpoints and queries against their budget with realistic data |

Test observable behaviour: the response, the rows written, the job enqueued, the event recorded. Tests that only
assert a private method was called break on every refactor and prove little.

Do not write tests for every constant, simple delegation or configuration line. TDD is for behaviour and risk.

## Existing tests are evidence

Before changing code:

- Run the related tests and record the result (which pass, which fail, which are skipped). A failure that existed
  before your change is reported as pre-existing, not fixed silently and not blamed on your change.

While changing code, never:

- delete an assertion or replace it with a weaker one (`toBeDefined` instead of the value, `>= 0` instead of the
  count) to get Green;
- add `skip`, `only`, `todo`, `xit`, or exclude a file from the run or from coverage;
- bulk-update snapshots (`-u`) to hide a behaviour change; update one snapshot at a time and say why;
- replace a failing integration test with a mocked one;
- raise timeouts or add retries to hide a flaky test without finding the cause;
- use `forceExit`, `--detectOpenHandles` silencing, or `process.exit` in teardown to hide leaked handles;
- lower an agreed coverage or quality threshold.

When a test must change:

- **Approved behaviour change:** the product or contract changed on purpose. Update the test, say which old
  expectation changed and why, and keep the new behaviour at least as well covered.
- **Wrong or obsolete test:** the test asserted something that was never the rule. Fix it and say so; keep this
  separate from a real regression.

## When tests cannot run

If the environment cannot run the tests (no container runtime, no network, missing service), still write the tests,
say exactly which command could not run and why, and do not report Red or Green that was not observed.

## Test hygiene

- Build the app without opening a port (`buildApp()` then `app.inject()`, or the framework's testing module).
- Every test closes what it opened: pools, Redis clients, workers, timers, servers.
- Control time and randomness (fake timers, injected clock, seeded ids). Wait on a condition with a deadline, not a
  fixed `sleep`.
- Parallel tests do not share mutable rows: a database or schema per worker, or unique tenant/user per test.
- Workers and the API may use different connections, so one wrapping test transaction does not roll back their work.
- The test database URL is not the production URL, and setup refuses to run against a non-test database (for
  example: require `NODE_ENV=test` and a database name ending in `_test`, or a container started by the test).
