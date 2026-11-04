export type LocaleSource = 'header' | 'profile' | 'accept-language' | 'fallback';

export interface LocaleInput {
  /** X-App-Locale: the language the client is showing right now. */
  header?: string | undefined;
  /** The verified user's saved preference. */
  profile?: string | undefined;
  /** The raw Accept-Language header. */
  acceptLanguage?: string | undefined;
  supported: readonly string[];
  fallback: string;
}

/** Canonical BCP 47 tag, or undefined when the tag is not valid. */
function canonical(tag: string): string | undefined {
  try {
    return Intl.getCanonicalLocales(tag.trim())[0];
  } catch {
    return undefined;
  }
}

/** Best supported locale for one requested tag: exact match, then same base language. */
export function matchSupported(requested: string, supported: readonly string[]): string | undefined {
  const tag = canonical(requested);
  if (!tag) return undefined;
  const exact = supported.find((s) => s.toLowerCase() === tag.toLowerCase());
  if (exact) return exact;
  const base = tag.split('-')[0]!.toLowerCase();
  return (
    supported.find((s) => s.toLowerCase() === base) ??
    supported.find((s) => s.split('-')[0]!.toLowerCase() === base)
  );
}

/** Language tags from Accept-Language, highest quality first; q=0, wildcards and invalid entries dropped. */
export function parseAcceptLanguage(header: string | undefined): string[] {
  if (!header) return [];
  const entries: { tag: string; q: number; index: number }[] = [];
  header.split(',').forEach((part, index) => {
    const [rawTag, ...params] = part.trim().split(';');
    const tag = rawTag?.trim();
    if (!tag || tag === '*' || !canonical(tag)) return;
    let q = 1;
    for (const param of params) {
      const [name, value] = param.trim().split('=');
      if (name?.trim() !== 'q') continue;
      if (!value || !/^(0(\.\d{0,3})?|1(\.0{0,3})?)$/.test(value.trim())) return;
      q = Number(value);
    }
    if (q > 0) entries.push({ tag, q, index });
  });
  return entries.sort((a, b) => b.q - a.q || a.index - b.index).map((e) => e.tag);
}

/**
 * Resolution order: supported X-App-Locale → verified profile preference → Accept-Language → fallback.
 * An unsupported or malformed candidate is skipped; it never blocks the next one.
 */
export function resolveLocale(input: LocaleInput): { locale: string; source: LocaleSource } {
  const candidates: [LocaleSource, string | undefined][] = [
    ['header', input.header],
    ['profile', input.profile],
    ...parseAcceptLanguage(input.acceptLanguage).map((tag): [LocaleSource, string] => ['accept-language', tag]),
  ];
  for (const [source, tag] of candidates) {
    const locale = tag ? matchSupported(tag, input.supported) : undefined;
    if (locale) return { locale, source };
  }
  return { locale: input.fallback, source: 'fallback' };
}
