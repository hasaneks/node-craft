import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from './errors.ts';

export interface Position {
  createdAt: string;
  id: string;
}

const sign = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest('base64url');

/** Opaque, signed cursor bound to the sort it was made for. */
export function encodeCursor(position: Position, sort: string, secret: string): string {
  const payload = Buffer.from(JSON.stringify({ s: sort, c: position.createdAt, i: position.id })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function decodeCursor(cursor: string, sort: string, secret: string): Position {
  const invalid = () => new AppError('INVALID_CURSOR');
  const [payload, signature, extra] = cursor.split('.');
  if (!payload || !signature || extra !== undefined) throw invalid();
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw invalid();

  let data: unknown;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    throw invalid();
  }
  const { s, c, i } = (data ?? {}) as Record<string, unknown>;
  if (s !== sort || typeof c !== 'string' || typeof i !== 'string' || Number.isNaN(Date.parse(c))) throw invalid();
  return { createdAt: c, id: i };
}
