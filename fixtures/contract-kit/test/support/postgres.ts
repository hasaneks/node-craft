import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';
import { migrate } from '../../src/schema.ts';

export interface TestDatabase {
  pool: pg.Pool;
  [Symbol.asyncDispose](): Promise<void>;
}

/**
 * A disposable PostgreSQL per test file. Never points at a shared database: the URL comes from the container the
 * test started, so a wrong DATABASE_URL in the environment cannot be touched.
 */
export async function startPostgres(): Promise<TestDatabase> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    process.env.TEST_POSTGRES_IMAGE ?? 'postgres:18-alpine',
  ).start();
  const pool = new pg.Pool({ connectionString: container.getConnectionUri(), max: 10 });
  await migrate(pool);
  return {
    pool,
    async [Symbol.asyncDispose]() {
      await pool.end();
      await container.stop();
    },
  };
}

export const ids = {
  tenantA: '00000000-0000-7000-8000-00000000000a',
  tenantB: '00000000-0000-7000-8000-00000000000b',
  alice: '00000000-0000-7000-8000-0000000000a1',
  bob: '00000000-0000-7000-8000-0000000000b1',
  mallory: '00000000-0000-7000-8000-0000000000c1',
};

export async function seedUsers(pool: pg.Pool) {
  await pool.query(
    `INSERT INTO users (id, tenant_id, preferred_locale) VALUES
       ($1, $4, 'tr'), ($2, $4, 'en'), ($3, $5, 'en')`,
    [ids.alice, ids.bob, ids.mallory, ids.tenantA, ids.tenantB],
  );
}

export const count = async (pool: pg.Pool, table: string) =>
  Number((await pool.query(`SELECT count(*) FROM ${table}`)).rows[0].count);
