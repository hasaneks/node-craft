import type pg from 'pg';

// A real service keeps these as versioned migration files. One statement list keeps the fixture readable.
const statements = [
  `CREATE TABLE users (
     id               uuid PRIMARY KEY,
     tenant_id        uuid NOT NULL,
     preferred_locale text NOT NULL DEFAULT 'en'
   )`,
  `CREATE TABLE orders (
     id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id     uuid        NOT NULL,
     user_id       uuid        NOT NULL REFERENCES users (id),
     product_sku   text        NOT NULL CHECK (char_length(product_sku) BETWEEN 1 AND 64),
     quantity      int         NOT NULL CHECK (quantity BETWEEN 1 AND 100),
     contact_email text        NOT NULL,
     status        text        NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'cancelled')),
     created_at    timestamptz NOT NULL DEFAULT clock_timestamp()
   )`,
  // Foreign keys get no index automatically; this one serves the list query and parent deletes.
  `CREATE INDEX orders_owner_created ON orders (tenant_id, user_id, created_at DESC, id DESC)`,
  `CREATE TABLE idempotency_keys (
     tenant_id     uuid        NOT NULL,
     user_id       uuid        NOT NULL,
     operation     text        NOT NULL,
     key           text        NOT NULL CHECK (char_length(key) BETWEEN 8 AND 255),
     fingerprint   text        NOT NULL,
     status        text        NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
     response_code int,
     response_body jsonb,
     created_at    timestamptz NOT NULL DEFAULT now(),
     PRIMARY KEY (tenant_id, user_id, operation, key)
   )`,
  `CREATE TABLE outbox (
     id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
     topic         text        NOT NULL,
     payload       jsonb       NOT NULL,
     created_at    timestamptz NOT NULL DEFAULT now(),
     available_at  timestamptz NOT NULL DEFAULT now(),
     attempts      int         NOT NULL DEFAULT 0,
     dispatched_at timestamptz,
     last_error    text
   )`,
  `CREATE INDEX outbox_pending ON outbox (available_at) WHERE dispatched_at IS NULL`,
];

export async function migrate(pool: pg.Pool): Promise<void> {
  for (const sql of statements) await pool.query(sql);
}
