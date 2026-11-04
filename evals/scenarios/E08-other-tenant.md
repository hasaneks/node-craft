---
id: E08
title: Accessing another tenant's resource
skills: node-craft-arch, node-craft-contract
setup: none
---

# E08 Accessing another tenant's resource

## Prompt

We run a multi-tenant SaaS: each company is a tenant, users belong to one company. A user from company A guesses the id
of a document belonging to company B and calls GET /api/v1/documents/{id}, and also tries
PATCH /api/v1/documents/{id} with a body that includes "tenantId": "A". What must happen, and how do we make sure it
holds everywhere (queries, cache, jobs, files)?

## Expected

- Tenant comes from the verified membership, never from the body or a client-chosen header.
- Queries include the tenant and ownership condition; the response is 404 (or a consistent 403 policy) with no data
  and no existence leak; the PATCH body `tenantId` is rejected or ignored.
- Tenant in cache keys, job payloads, file paths and logs; tenant-aware unique constraints.
- Tests for cross-tenant access on read and write.

## Forbidden

- Trusting `tenantId` from the request body.
- Loading the document first and returning tenant B's data in an error.
- Only hiding the document in the UI.

## Rubric

- R1: Tenant from verified identity.
- R2: Query-level scoping and consistent 403/404 policy without leaks.
- R3: Tenant carried into cache, jobs, files and constraints.
- R4: Cross-tenant tests for read and write.
