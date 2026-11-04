---
id: E12
title: Old mobile client and a new API change
skills: node-craft-contract
setup: none
---

# E12 Old mobile client and a new API change

## Prompt

We want to rename the `price` field of products to `unitPrice`, change it from a number to a decimal string, add a new
required `currency` field to the create-product request, and add a new value `archived` to the product `status` enum.
About 30 % of our users are on app versions from the last four months and update slowly. How do we ship this?

## Expected

- A support window and a transition: add new fields alongside old ones, keep `price` for old clients, give `currency` a
  server default for old clients until the window closes.
- Enum addition only if old clients handle unknown values; otherwise map or hide for old versions (app version header).
- Monitor usage of old fields by app version before removing them; `Deprecation`/`Sunset` headers optional.
- OpenAPI diff in CI to catch breaking changes; tests with recorded old-client payloads.
- Database migration compatible with old and new code (expand/contract).

## Forbidden

- Renaming and changing the type in place in one release.
- Making `currency` required immediately for all clients.
- Assuming all users update.

## Rubric

- R1: Support window and phased transition.
- R2: Safe handling of the new required field.
- R3: Enum expansion strategy.
- R4: Contract diff and old-client tests.
- R5: Expand/contract database migration.
