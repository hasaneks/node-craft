import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodeCursor, decodeCursor } from '../src/cursor.ts';
import { AppError } from '../src/errors.ts';

const secret = 'test-cursor-secret';
const position = { createdAt: '2026-11-04T08:30:00.000Z', id: '0193f0c6-0000-7000-8000-000000000001' };

describe('cursor', () => {
  it('round-trips a position', () => {
    assert.deepEqual(decodeCursor(encodeCursor(position, 'created_desc', secret), 'created_desc', secret), position);
  });

  it('is opaque url-safe text', () => {
    assert.match(encodeCursor(position, 'created_desc', secret), /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  const invalid = (cursor: string, sort = 'created_desc') =>
    assert.throws(
      () => decodeCursor(cursor, sort, secret),
      (error: unknown) => error instanceof AppError && error.code === 'INVALID_CURSOR',
    );

  it('rejects a cursor made for another sort', () => invalid(encodeCursor(position, 'created_desc', secret), 'total_desc'));

  it('rejects a tampered cursor', () => {
    const cursor = encodeCursor(position, 'created_desc', secret);
    const [payload, signature] = cursor.split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload!, 'base64url').toString()), i: 'other' }),
    ).toString('base64url');
    invalid(`${forged}.${signature}`);
  });

  it('rejects garbage', () => {
    invalid('not-a-cursor');
    invalid('');
    invalid('e30.e30');
  });
});
