# When a test may change

Existing tests record decisions. Treat a failing test as a report about the code first.

| Situation | Allowed | Required |
|---|---|---|
| The code broke a correct test | No test change | Fix the code |
| The product or contract changed on purpose (approved) | Update the test | Say which expectation changed and why; keep the new behaviour at least as covered |
| The test asserted something that was never the rule | Fix the test | Say why it was wrong; keep it apart from any regression in the same change |
| The test is flaky | Find the cause (shared data, time, order, leaked handles) | No added retries, longer sleeps or `skip` as the fix |
| The test needs infrastructure that is not available | Leave it as it is | Report which tests could not run and why |

Never, to get green:

- delete or weaken an assertion;
- add `skip`, `only`, `todo`, or exclude a file from the run or coverage;
- bulk-update snapshots;
- replace a failing integration test with mocks;
- lower a coverage or quality threshold;
- use `forceExit` or swallow teardown errors to hide leaks;
- ignore a non-zero exit code in a script or CI step.

A pull request that changes tests says so in its description, test by test, with the reason.
