export type Catalog = Record<string, string | undefined>;
export type Catalogs = Record<string, Catalog>;
export type Translate = (key: string, locale: string, params?: Record<string, string | number>) => string | undefined;

/**
 * Looks a key up in the requested locale only. A missing key returns undefined and is reported, so the caller can
 * fall back to a generic message in the same language instead of leaking another language.
 */
export function createTranslator(
  catalogs: Catalogs,
  fallbackLocale: string,
  onMissing: (key: string, locale: string) => void = () => {},
): Translate {
  return (key, locale, params = {}) => {
    const message = catalogs[locale]?.[key] ?? (catalogs[locale] ? undefined : catalogs[fallbackLocale]?.[key]);
    if (message === undefined) {
      onMissing(key, locale);
      return undefined;
    }
    return message.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(params[name] ?? ''));
  };
}

/** `locale:key` for every key the fallback catalog has and another locale lacks. Run it in CI. */
export function missingKeys(catalogs: Catalogs, fallbackLocale: string): string[] {
  const reference = Object.keys(catalogs[fallbackLocale] ?? {});
  return Object.entries(catalogs)
    .filter(([locale]) => locale !== fallbackLocale)
    .flatMap(([locale, catalog]) => reference.filter((key) => !catalog[key]).map((key) => `${locale}:${key}`));
}
