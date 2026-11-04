<p align="center">
  <a href="README.md">English</a> · <b>Türkçe</b>
</p>

<p align="center">
  <img alt="Node.js Active LTS" src="https://img.shields.io/badge/Node.js-Active%20LTS-5FA04E?logo=nodedotjs&logoColor=white">
  <img alt="Fastify ve NestJS" src="https://img.shields.io/badge/Fastify%20%7C%20NestJS-TypeScript-000000">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Prisma%20%7C%20Drizzle-4169E1?logo=postgresql&logoColor=white">
  <img alt="Agent skill'leri" src="https://img.shields.io/badge/skills-Claude%20Code%20%7C%20Cursor%20%7C%20Codex-7ee2b8">
  <img alt="MIT lisansı" src="https://img.shields.io/badge/lisans-MIT-lightgrey">
</p>

# node-craft

**Production'da ayakta kalan Node.js ve TypeScript backend'leri için agent skill'leri: kararı verilmiş stack, dürüst
testler, güvenli veri, net API sözleşmesi ve sürprizsiz deploy.**

AI ajanları backend'i mutlu yol için yazar. Ortaya şunlar çıkar: aynı siparişi iki istekle iki kez oluşturan bir
`SELECT` + `INSERT`, request body'den alınan `userId`, iki kez ücret çeken bir retry, istemcide karşılaştırılan hata
mesajı, her replica açılırken çalışan migration ve hep 200 dönen healthcheck. Hepsi demoda çalışır, hepsi
production'da bozulur.

node-craft, bunları önleyen kuralları ve çalışma sırasını ajana, iş sırasında yüklediği skill'ler olarak verir.

## Kısaca

- **Önce proje karar verir.** Mevcut framework, ORM, kimlik altyapısı ve paket yöneticisi korunur. Yeni projede stack
  üründen seçilir ve ADR'lerle kayda geçer.
- **Dürüst TDD.** Doğru sebeple Red, sonra Green, sonra Refactor. Mevcut testler yeşile çekmek için zayıflatılmaz;
  çalıştırılmayan kontrol çalıştırılmadı diye raporlanır.
- **Güvenilir veri.** Kurallar PostgreSQL constraint'lerinde, transaction'lar kısa, kritik yazmalar idempotent, kaybolmaması
  gereken yan etkilerde transactional outbox, güvenli migration.
- **Her istemci için tek sözleşme.** Tek şema kaynağından REST + OpenAPI, sabit hata kodları ve yerelleştirilmiş
  mesajlar, öncelik sırası net bir locale header'ı, cursor pagination, idempotency anahtarları.
- **Yalnız ürünün ihtiyacı olan.** Redis, BullMQ, Firebase, FCM, Adapty ve object storage gerekçeyle eklenir, varsayılan
  olarak asla.
- **Her yerde çalıştırmaya hazır.** Belirli bir platform varsayılmaz: migration için tek release adımı, dürüst healthcheck, graceful shutdown, CI kapıları,
  yedekleme ve restore testi.

## Hızlı başlangıç

```bash
npx skills add hasaneks/node-craft
```

İsterseniz `skills/node-craft*` klasörlerini ajanınızın skill klasörüne elle de kopyalayabilirsiniz (Claude Code için:
`.claude/skills/`). Her skill klasörü kendi içinde tamamdır; yalnız istediklerinizi kurabilirsiniz, `node-craft`
(çekirdek) mutlaka kalmalıdır.

Sonra işi düz cümleyle isteyin: *"kitapçı API'si için backend kur"*, *"faturalarımı listeleyen endpoint ekle"*,
*"sipariş listesi yavaş"*, *"bu webhook bazen premium'u iki kez veriyor"*, *"deploy'u hazırla"*. Doğru skill
kendiliğinden yüklenir.

İstemci şart değildir. Henüz istemcisi olmayan bir backend, web veya admin uygulaması, native mobil uygulama ve React
Native uygulaması aynı skill'leri kullanır.

## Skill'ler

| Skill | Ne zaman | Ne yapar |
|---|---|---|
| [`node-craft`](skills/node-craft/SKILL.md) | Her backend değişikliğinde | Önce projenin kararlarını okur; mevcut testleri koruyan TDD, tamamlanma ölçütü, dürüst rapor ve sıradaki skill |
| [`node-craft-init`](skills/node-craft-init/SKILL.md) | Backend başlatırken, stack seçerken, ortam eklerken | Ürün analizi, Active LTS Node, strict TypeScript, sabit Yarn, üründen seçilen Fastify veya NestJS + Fastify adapter, Prisma veya Drizzle ile PostgreSQL, config şeması, script'ler, klasör yapısı, ADR'ler ve `STACK.md` |
| [`node-craft-arch`](skills/node-craft-arch/SKILL.md) | API'nin arkasındakini kurarken | Modüller, veri modeli, transaction ve idempotency, migration, Firebase kimliği ve tenant yetkilendirmesi, güvenlik, backend i18n, Redis, BullMQ, outbox, push ve e-posta, webhook ve Adapty, dosyalar, log ve audit |
| [`node-craft-contract`](skills/node-craft-contract/SKILL.md) | Endpoint eklerken veya değiştirirken, istemci bağlarken | Tek kaynaktan OpenAPI, runtime doğrulama, hata zarfı ve status eşlemesi, locale header'ı, cursor pagination, `Idempotency-Key`, kimlik sonuçları, eski mobil sürümler için sürümleme |
| [`node-craft-fix`](skills/node-craft-fix/SKILL.md) | Bir şey bozulduğunda | Mevcut durumu kaydeder, gerçek giriş noktasından yeniden üretir, regresyon testi, en küçük düzeltme, kanıt |
| [`node-craft-perf`](skills/node-craft-perf/SKILL.md) | Bir şey yavaş olduğunda | Bütçeler, `EXPLAIN`, N+1, indeksler, pool ve bağlantı bütçesi, event loop, yük testi, önce/sonra rakamları |
| [`node-craft-ops`](skills/node-craft-ops/SKILL.md) | Deploy ederken ve işletirken | Her platform: build, start, release adımında migration, healthcheck, graceful shutdown, CI kapıları, yedekleme ve restore, runbook'lar |

Projenin `STACK.md` dosyası, ADR'leri ve mevcut kodu varsayılanların önüne geçer. Şablon:
[`skills/node-craft-init/references/stack-template.md`](skills/node-craft-init/references/stack-template.md).

## Kurallar

[`RULES.md`](RULES.md) her kuralı ne, neden, nasıl, istisnalar ve **nasıl doğrulandığı** ile listeler. Önemli backend
hatalarının çoğu sözdiziminden görülemez; bu yüzden node-craft bu sürümde lint plugin'i içermez:

| Doğrulama | Kural |
|---|---:|
| `test` (çoğu gerçek PostgreSQL ile) | 32 |
| `review` | 19 |
| `contract` (OpenAPI ve payload kontrolleri) | 9 |
| `measurement` | 5 |
| `lint` (yalnız mevcut ESLint/TypeScript kuralları) | 1 |

Toplam 50 kural var; çoğunun birden fazla doğrulama türü olduğu için sayılar örtüşür.

## Yeni proje varsayılanları

| Alan | Varsayılan |
|---|---|
| Runtime | O gün doğrulanan güncel Active LTS Node.js |
| Dil | TypeScript, `strict` |
| Paket yöneticisi | Yarn, proje seviyesinde sabit, tek lockfile |
| HTTP | Fastify; büyük ve orkestrasyon yoğun domain'lerde `@nestjs/platform-fastify` ile NestJS. Express değil |
| Veritabanı | PostgreSQL, Prisma veya Drizzle (projede tek) |
| API | REST + OpenAPI, runtime doğrulama, `{ data, meta }`, `{ error: { code, message, details }, locale, requestId }` |
| Testler | Vitest veya Jest, gerçek PostgreSQL ile entegrasyon testleri |
| Loglar | Redaction ve request id'li Pino JSON |
| Deploy | Herhangi bir platform; projenin seçimi, release adımı, healthcheck ve kapanma davranışıyla birlikte kayda geçer |
| İsteğe bağlı | Redis, BullMQ, outbox, Firebase Admin, FCM, Adapty, object storage: yalnız gerektiğinde |

## rn-craft ile birlikte (isteğe bağlı)

[rn-craft](https://github.com/hasaneks/rn-craft) React Native uygulamalarını, node-craft onların backend'ini kurar.
İkisi birbirine bağımlı değildir. İkisini birlikte kullanıyorsanız
[`docs/compatibility/rn-craft.md`](docs/compatibility/rn-craft.md) şunları gösterir: uygulamanın RTK Query base
query'si dili nasıl gönderir ve hata modelini nasıl eşler, alan hataları react-hook-form'a nasıl taşınır, pagination ve
idempotency anahtarları nasıl akar, Firebase, backend ve Adapty kimlikleri ile push token'ları nasıl eşleşir. Belge
rn-craft 0.2.0'daki boşlukları ve rn-craft'a henüz eklenmemiş önerilen bir [patch](docs/compatibility/rn-craft-companion.patch)
dosyasını da listeler.

## SSS

**rn-craft olmadan çalışır mı?** Evet. node-craft'ın rn-craft'a bağımlılığı yoktur, hiçbir skill rn-craft dosyası
okumaz. İstemci sözleşmesi framework'ten bağımsızdır.

**rn-craft uyumu neyi ekler?** İsteğe bağlı bir rehber ve rn-craft için önerilen bir patch: base query'de
`X-App-Locale`, `{ error: { code, message, details }, locale, requestId }` modelinin yeni `conflict` ve `rateLimited`
durumlarıyla `ApiError`'a eşlenmesi, alan hatalarının formlara taşınması, `{ data, meta }` cursor'ları, kimlik eşlemesi
ve push token yaşam döngüsü.

**Yeni proje ile mevcut proje nasıl ayrılıyor?** Yeni projeler `node-craft-init`'in seçip kayda geçirdiği yukarıdaki
varsayılanları alır. Mevcut projeler framework'ünü, ORM'ini, kimlik altyapısını, paket yöneticisini ve hata
biçimini korur; node-craft dokunduğu kodu iyileştirir, büyük değişiklikleri öneri olarak yazar.

**Hangi kurallar statik, hangileri test veya ölçüm ister?** Yukarıdaki tabloya ve `RULES.md`'de her kuralın **Verify**
alanına bakın. Yalnız bir kural (`strict-typescript`) lint'e, mevcut typescript-eslint kuralları üzerinden dayanır;
gerisi test, sözleşme kontrolü, ölçüm veya inceleme ister.

**Gerçekte ne doğrulandı?** [`docs/validation.md`](docs/validation.md): paket bütünlüğü testleri, contract kit'in birim
ve PostgreSQL entegrasyon testleri ve puanları ile maliyetleriyle eval koşuları.

**Express veya Express üzerinde NestJS ile çalışır mı?** Mevcut projede evet: korur. Express'ten yalnız yeni projelerde
kaçınır.

## Geliştirme

```bash
npm test                          # paket bütünlüğü testleri, bağımlılık yok
cd fixtures/contract-kit
yarn install --immutable
yarn test                         # birim + PostgreSQL entegrasyon testleri (container runtime gerekir)
cd ../..
npm run evals -- --only E01       # Claude Code CLI ile görev eval'leri (ücretlidir)
```

Entegrasyon testleri PostgreSQL'i Testcontainers ile başlatır; Docker veya başka bir container runtime gerekir (örneğin
Colima: `DOCKER_HOST`'u onun soketine ve `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock` olarak ayarlayın).

Paketin mimarisi: [`docs/architecture.md`](docs/architecture.md). Hangi gereksinim nerede karşılanıyor:
[`docs/requirements-coverage.md`](docs/requirements-coverage.md). Katkı: [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Lisans

[MIT](LICENSE) © Hasan Ekşi
