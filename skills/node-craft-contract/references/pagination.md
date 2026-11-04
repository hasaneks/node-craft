# Pagination, sorting and filters

## Limits

Every list is bounded. Default page size 20, maximum 100, unless the project decides otherwise and documents it.
A `limit` above the maximum is rejected with 400 (or clamped, if that is the documented policy; pick one).

## Cursor pagination (default for growing lists)

- Sort by a stable key with a unique tie-breaker: `ORDER BY created_at DESC, id DESC`.
- The cursor encodes the last row's sort values at the column's **full precision**, opaque to clients (base64url of a
  small JSON), and is validated on the way in: wrong shape, wrong sort, or tampered values → 400 `INVALID_CURSOR`. Sign it (HMAC) if its contents must
  not be forged.
- Query with a row comparison, which uses the index:

```sql
SELECT id, created_at, total FROM orders
WHERE tenant_id = $1 AND (created_at, id) < ($2, $3)
ORDER BY created_at DESC, id DESC
LIMIT $4 + 1;  -- one extra row tells whether there is a next page
```

- `timestamptz` keeps microseconds; a JS `Date` keeps milliseconds. Build the cursor from the database's text form
  (`to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`), not from `Date.toISOString()`, or
  rows created within the same millisecond are skipped. Alternatively declare the column `timestamptz(3)`.
- Response:

```json
{
  "data": [{ "id": "…", "createdAt": "2026-11-04T08:30:00Z", "total": "12.50" }],
  "meta": { "nextCursor": "eyJjIjoiMjAyNi0xMS0wNFQwODozMDowMFoiLCJpIjoi4oCmIn0", "hasMore": true, "limit": 20 }
}
```

- Last page: `nextCursor: null`, `hasMore: false`. An empty list is `data: []` with status 200.
- The cursor is tied to the sort and filters it was created with; changing them starts from the first page.

## Offset pagination

Acceptable for small, bounded lists (admin tables with a few thousand rows). Cap the maximum offset; deep offsets
scan and discard rows.

## Counts

Do not compute an exact `total` on every request for large tables. Offer it only when the product needs it, as an
estimate, a separate endpoint, or a capped count (`hasMore` is often enough).

## Sorting and filters

- Allowlist sort fields and filter fields, each mapped to a column in code. User input never becomes a column name
  or an SQL fragment.
- Filters have types and limits (date ranges with a maximum span, `in` lists with a maximum length).
- Clients read `data` and `meta` as described here; generated client types and transforms (for example an RTK Query
  `transformResponse`) follow the same shape.
