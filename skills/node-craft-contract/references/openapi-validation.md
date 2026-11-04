# Resources, schemas and OpenAPI

## Resources

- Name paths after resources and business actions: `GET /api/v1/orders`, `POST /api/v1/orders`,
  `POST /api/v1/orders/{orderId}/cancel` (an action that is not plain field editing gets its own sub-resource).
- Plural nouns, kebab-case path segments, camelCase JSON fields, one style everywhere.
- Status codes: `200` read or update with body, `201` created (with `Location` when useful), `202` accepted for async
  work (with a status resource), `204` no body.

## One schema source

| Approach | When | How |
|---|---|---|
| Code-first | Most projects | Fastify: JSON Schema via TypeBox (`@fastify/type-provider-typebox`) or another official type provider, `@fastify/swagger` builds OpenAPI from route schemas. NestJS: DTOs with `class-validator` + `@nestjs/swagger`, or Zod/TypeBox schemas with a pipe and an OpenAPI generator, one approach for the whole app |
| Schema-first | The spec is agreed with other teams before code | Hand-written OpenAPI is the source; generate validators and types from it; CI checks routes match it |

- Do not define the same field's rules in two places (a DTO class and a separate Zod schema that drift).
- If the chosen schema system is not the framework's native one, prove validation, serialization and OpenAPI all
  work from it before building on it.
- Schemas are application code. Never compile a schema provided by a user.

## Validation

- Validate body, path params, query and required headers at runtime.
- Unknown properties: one central policy. Default: reject (`additionalProperties: false`) for request bodies, so a
  typo is a 400 instead of silently ignored. Fastify's default Ajv options strip unknown properties
  (`removeAdditional: true`) instead of rejecting them; set `ajv: { customOptions: { removeAdditional: false } }`
  (and `allErrors: true` if you want every field error at once, with bounded schemas). Whatever the policy, never spread a request body into a database entity
  (mass assignment); map allowed fields explicitly.
- Format validation does no database or network work. Business checks that need the database (the referenced
  product exists, the email is not taken) run in the use case after validation and return domain errors.
- Limits in schemas: `maxLength` on strings, `maxItems` on arrays, `minimum`/`maximum` on numbers, patterns anchored
  and simple.

## Responses

- A response schema per status. Fastify serializes with it and drops fields not in the schema; NestJS needs explicit
  mapping or serialization groups. Either way, a new database column never leaks by default.
- Success envelope `{ data, meta? }`; lists put pagination in `meta`. `204` has no body.
- Nullable and optional are different: `null` means "known to be empty", absent means "not provided". Document which
  fields are which; prefer explicit `null` over absent in responses.
- Enums: document that new values can appear; clients must handle unknown values.
- Numbers and time:
  - money: `{ "amount": "12.50", "currency": "TRY" }` or `{ "amountMinor": 1250, "currency": "TRY" }`, one choice
    for the whole API;
  - `bigint` and ids beyond 2^53: strings;
  - instants: ISO 8601 with offset; calendar dates: `YYYY-MM-DD`; time zones: IANA names.

## OpenAPI content

The document includes: security schemes (Bearer, cookies), every error response with the shared error schema, the
`X-App-Locale` and `Accept-Language` request headers and `Content-Language` response header, `Idempotency-Key` where
supported, pagination parameters and `meta`, `Retry-After` on 429 and 503, and the API version. Commit the generated
spec (`openapi.json`) and fail CI when it is stale.
