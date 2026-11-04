# Contributing

Thanks for helping. node-craft is a set of agent skills, so a change is a change to what agents do in real projects.
Keep it small, concrete and verified.

## Before you open a pull request

1. `npm run check` passes. It runs the package integrity tests and the contract kit (typecheck, unit and PostgreSQL
   integration tests; needs a container runtime). The GitHub workflow is manual for now, so this local run is the
   gate.
3. If you changed a skill's guidance in a way an eval covers, run that eval (`npm run evals -- --only E07`) and put
   the before and after scores in the pull request. Evals cost money; say if you could not run them.

## Writing rules for skills

- `SKILL.md` stays short (under 150 lines). Detail goes into `references/`, and `SKILL.md` names every reference with
  when to read it.
- A skill never links outside its own folder; skills are installed one folder at a time. Refer to another skill by
  name: `` `node-craft-arch` → `references/auth.md` ``.
- Policies, not version numbers. Dated facts go into a `sources.md` (or a dated note) with the official link.
- Optional services stay optional. Write "when the product has X", never make X a default.
- New rules go into `RULES.md` with Rule, Why, How, Verify (`lint`, `test`, `contract`, `measurement`, `review`),
  Exceptions and Skill, and into `docs/requirements-coverage.md` if they cover a requirement section.
- Code in references should come from, or be checked against, `fixtures/contract-kit`.
- Plain, direct English. No marketing words.

## Images

The README images are HTML in `docs/images/src/`, rendered to PNG with headless Chrome: `npm run images`. Update the
numbers in `eval-results.html` when you rerun the evals.

## Reporting a problem

Open an issue with the prompt you gave the agent, what it did, and what you expected. If it is a security issue, see
[SECURITY.md](SECURITY.md).
