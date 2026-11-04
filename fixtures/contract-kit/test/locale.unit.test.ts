import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLocale, parseAcceptLanguage } from '../src/locale.ts';

const supported = ['en', 'tr', 'pt-BR'];
const resolve = (input: Partial<Parameters<typeof resolveLocale>[0]>) =>
  resolveLocale({ supported, fallback: 'en', ...input });

describe('resolveLocale', () => {
  it('uses a supported X-App-Locale first', () => {
    assert.deepEqual(resolve({ header: 'tr', profile: 'en', acceptLanguage: 'en' }), { locale: 'tr', source: 'header' });
  });

  it('skips an unsupported header and uses the profile', () => {
    assert.deepEqual(resolve({ header: 'de', profile: 'tr', acceptLanguage: 'en' }), { locale: 'tr', source: 'profile' });
  });

  it('skips a malformed header without failing', () => {
    assert.deepEqual(resolve({ header: '!!', profile: 'tr' }), { locale: 'tr', source: 'profile' });
  });

  it('falls to Accept-Language when there is no header or profile', () => {
    assert.deepEqual(resolve({ acceptLanguage: 'de;q=1, tr;q=0.8, en;q=0.5' }), {
      locale: 'tr',
      source: 'accept-language',
    });
  });

  it('uses the fallback when nothing matches', () => {
    assert.deepEqual(resolve({ header: 'de', acceptLanguage: 'fr, ja' }), { locale: 'en', source: 'fallback' });
  });

  it('matches a regional tag to its supported base language', () => {
    assert.equal(resolve({ header: 'en-GB' }).locale, 'en');
    assert.equal(resolve({ header: 'tr-TR' }).locale, 'tr');
  });

  it('prefers an exact regional match and normalizes case', () => {
    assert.equal(resolve({ header: 'pt-br' }).locale, 'pt-BR');
  });

  it('matches a base tag to a supported regional variant when it is the only one', () => {
    assert.equal(resolve({ header: 'pt' }).locale, 'pt-BR');
  });
});

describe('parseAcceptLanguage', () => {
  it('orders by quality and drops q=0 and wildcards', () => {
    assert.deepEqual(parseAcceptLanguage('en;q=0.5, tr, de;q=0, *;q=0.1, fr;q=0.9'), ['tr', 'fr', 'en']);
  });

  it('keeps header order for equal quality', () => {
    assert.deepEqual(parseAcceptLanguage('tr, en'), ['tr', 'en']);
  });

  it('ignores invalid entries and invalid quality values', () => {
    assert.deepEqual(parseAcceptLanguage('tr;q=abc, ;;, en;q=2, de'), ['de']);
  });

  it('returns nothing for an empty or missing header', () => {
    assert.deepEqual(parseAcceptLanguage(undefined), []);
    assert.deepEqual(parseAcceptLanguage(''), []);
  });
});
