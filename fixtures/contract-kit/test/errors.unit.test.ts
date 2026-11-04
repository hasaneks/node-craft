import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AppError, toErrorResponse } from '../src/errors.ts';
import { createTranslator, missingKeys } from '../src/i18n.ts';
import { catalogs } from '../src/catalogs.ts';

const t = createTranslator(catalogs, 'en');

describe('toErrorResponse', () => {
  it('builds a Turkish validation error with stable codes and field details', () => {
    const error = new AppError('VALIDATION_ERROR', {
      details: [{ field: 'email', code: 'INVALID_EMAIL' }],
    });
    const { status, body } = toErrorResponse(error, { t, locale: 'tr', requestId: 'req-1' });
    assert.equal(status, 400);
    assert.deepEqual(body, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Lütfen işaretli alanları kontrol edin.',
        details: [{ field: 'email', code: 'INVALID_EMAIL', message: 'Geçerli bir e-posta adresi girin.' }],
      },
      locale: 'tr',
      requestId: 'req-1',
    });
  });

  it('maps each code to its HTTP status', () => {
    const cases = {
      AUTH_REQUIRED: 401,
      FORBIDDEN: 403,
      RESOURCE_NOT_FOUND: 404,
      CONFLICT: 409,
      IDEMPOTENCY_KEY_REUSED: 409,
      RATE_LIMITED: 429,
      SERVICE_UNAVAILABLE: 503,
    } as const;
    for (const [code, status] of Object.entries(cases)) {
      assert.equal(toErrorResponse(new AppError(code as keyof typeof cases), { t, locale: 'en', requestId: 'r' }).status, status);
    }
  });

  it('carries Retry-After for rate limits', () => {
    const { headers } = toErrorResponse(new AppError('RATE_LIMITED', { retryAfterSeconds: 30 }), {
      t,
      locale: 'en',
      requestId: 'r',
    });
    assert.deepEqual(headers, { 'retry-after': '30' });
  });

  it('hides unexpected errors behind a localized generic message', () => {
    const raw = new Error('relation "orders" does not exist at postgres://admin:secret@db');
    const { status, body } = toErrorResponse(raw, { t, locale: 'tr', requestId: 'r' });
    assert.equal(status, 500);
    assert.equal(body.error.code, 'INTERNAL_ERROR');
    assert.equal(body.error.message, 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    assert.doesNotMatch(JSON.stringify(body), /postgres|secret|relation/);
  });

  it('uses the generic message in the same locale when a translation is missing, and reports the key', () => {
    const missing: string[] = [];
    const partial = createTranslator(
      { en: catalogs.en, tr: { ...catalogs.tr, 'errors.CONFLICT': undefined } },
      'en',
      (key, locale) => missing.push(`${locale}:${key}`),
    );
    const { body } = toErrorResponse(new AppError('CONFLICT'), { t: partial, locale: 'tr', requestId: 'r' });
    assert.equal(body.error.code, 'CONFLICT');
    assert.equal(body.error.message, 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    assert.deepEqual(missing, ['tr:errors.CONFLICT']);
  });
});

describe('catalogs', () => {
  it('every supported locale has every key of the fallback locale', () => {
    assert.deepEqual(missingKeys(catalogs, 'en'), []);
  });

  it('every error code has a message', () => {
    for (const code of AppError.codes) assert.ok(catalogs.en[`errors.${code}`], code);
  });

  it('reports keys missing from a locale', () => {
    assert.deepEqual(missingKeys({ en: { a: 'A', b: 'B' }, tr: { a: 'A' } }, 'en'), ['tr:b']);
  });
});
