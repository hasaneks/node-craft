# ADR template

Short architecture decision records in `docs/adr/NNNN-title.md`. One decision per file. Write one for the framework,
the data access approach, module boundaries, and each piece of optional infrastructure (Redis, BullMQ, outbox,
object storage, identity provider) when it is added.

```markdown
# NNNN Title

- Status: accepted | proposed | superseded by NNNN
- Date: YYYY-MM-DD
- Need: the product fact that forces a decision (one or two sentences).
- Options: the realistic alternatives, including "do nothing" when it is one.
- Decision: what was chosen, with versions if relevant.
- Reasons: why, tied to the need; what was measured if anything.
- Consequences: what becomes easier, harder, or must now be maintained.
- Revisit when: the concrete condition that should reopen this decision.
```

In an existing project, a change to a decision the project already made is written with status `proposed` and is not
applied until approved.
