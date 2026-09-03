# MirasExplorer Final Project Status

Tarih: 2026-09-03

## Tamamlananlar

- JSON/ZIP/klasör medya aktarımı, duplicate commit koruması ve göreli yol normalizasyonu korunmuştur.
- Public FastAPI katalog uçları eklendi: `GET /api/public/assets`, `GET /api/public/assets/{id}`, `GET /api/public/facets`, `GET /api/public/media/{id}`.
- Arama eser adı, alternatif ad, kimlik, ilişkili kişi/yer, malzeme ve teknik üzerinden PostgreSQL `km` verisini sorgular; sayfalama kullanır.
- Public arama ve eser ayrıntı ekranları demo sabitlerini ana veri kaynağı olarak kullanmaz; API sonuçları ve dinamik facet'ler ile çalışır.
- Public medya ucu güvenli göreli yol kontrolü ile staging depodaki gerçek medya dosyasını servis eder.

## Doğrulama

- `python -m pytest -q --basetemp=../.test-tmp`: 10 passed, 2 skipped.
- FastAPI route startup/import: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS (8 mevcut uyarı).
- `npm run build`: PASS.

## Bilinen ortam engeli

`backend/.env` ile `127.0.0.1:5432/kulturel_miras` bağlantısı doğrulandı. `km` şemasında 33 temel tablo bulundu. Başlangıçta eser kaydı yoktu; 594494 paketi duplicate ön kontrolünde 3637 tamamen yeni kayıt verdiği için güvenli transaction ile commit edildi. Bunun sonucunda 92 gerçek `heritage_asset` kaydı oluştu.

Gerçek DB smoke testi başarılıdır: public search 92 kayıt döndürdü, seçilen asset detail ile açıldı, facets endpointi DB kaynaklı boş/dolu grupları döndürdü ve ilgili staging medya dosyası HTTP 200 ile servis edildi. Frontend `/ara` ve gerçek `/eser/{id}` route'ları HTTP 200 ile doğrulandı.

Dağıtım yapılandırması/kimlik bilgileri yoktur. FastAPI ve PostgreSQL gerektiren uygulama yalnız statik Sites yayını olarak dağıtılamaz.

## Production deployment

Production deployment durumu: `BLOCKED_BY_CREDENTIALS`. Yapılandırılmış veya doğrulanmış frontend hosting, FastAPI backend hosting, production PostgreSQL/PostGIS ve kalıcı object-storage hesabı bulunmuyor. Local `kulturel_miras` PostgreSQL veritabanı internetten expose edilmemelidir.

Production URL: yok. Backend URL: yok. Production database provider: yapılandırılmadı. Production media: yapılandırılmadı; mevcut medya yalnız local staging filesystem üzerindedir.

`.env.example`, `NEXT_PUBLIC_API_BASE_URL`, `DATABASE_URL` ve `CORS_ORIGINS` için güvenli production referanslarını içerir. CORS, production frontend URL'si sağlandığında wildcard kullanmadan bu domain'e sınırlandırılabilir.

## Recovery audit — 2026-09-04

Recovery branch: `recovery/mirasexplorer-production-fix`. Production Vercel root (`https://miras-explorer.vercel.app/`) HTTP 200 döndürüyor ancak editör içeriğini gösteriyor; bu kaynakta root route yeniden public homepage olarak düzeltildi. Render health, assets ve facets endpointleri HTTP 200 döndürüyor; assets yanıtı `total=0` olduğu için production Supabase verisi doğrulanmış olarak aktarılmış değildir.

Frontend import ekranı artık ayrı `NEXT_PUBLIC_IMPORT_API_URL` kullanmaz; import adresi `NEXT_PUBLIC_API_BASE_URL` değerinden türetilir. Local testler: TypeScript, production build ve pytest PASS.

## Phase 1 public-route recovery — 2026-09-04

Primary public navigation artık `/kesfet`, `/kategoriler`, `/atolye-turlari`, `/ara` ve `/giris` rotalarına gider. Canonical alt alanlar `/alt-alan/[code]`, kategori grupları `/alan/[code]`, atölyeler `/tur/[code]` altında data-driven sayfalarla erişilebilir; eski `/tur` güvenli biçimde yeni atölye indeksine yönlenir. Editor rotaları middleware ile Supabase kullanıcı doğrulamasına bağlanır ve yapılandırma eksikse guest kullanıcıyı `/giris?next=...` adresine yönlendirir.

Production Render API'si HTTP 200 ile `total=0` döndürmeye devam etmektedir. Supabase salt-okunur bağlantı bilgisi mevcut olmadığı için bunun boş katalog mu yoksa yayın filtresi mi olduğu doğrudan doğrulanamamıştır; production'a hiçbir veri yazılmamıştır.

## Sites-driven final rebuild — 2026-09-04

Sites tasarım incelemesiyle seçilen yön, hızlı arşiv erişimini tarihî avlu atmosferiyle birleştiren **Dijital Müze + Tarihî Avlular** yaklaşımıdır. Final dalda homepage için proje sahipliğinde dekoratif avlu görseli eklendi; bu görsel akademik katalog verisi değildir. Public data boşsa site hiçbir eser, kişi veya yer bilgisi uydurmaz.

## Living Heritage public experience — 2026-09-04

Public deneyim `Miras Yolculuğu` merkezli genişletildi: `/kesfet` artık aramaya yönlenmek yerine keşif yolları sunar; `/miras-yolculugu` tarihî avlu ile atölye portallarını, `/tur/[code]` ise alt alan odaklı erişilebilir 2.5D sahne ve koleksiyon çekmecesini kullanır. Sahneler dekoratif çevre kullanır; gerçek eser adı veya metadata üretmez ve arşiv sorgusu sayfalı public API'ye yönlenir. `/harita`, mevcut public API coğrafi kayıt yayınlamadığı için açık bir hazır-altyapı durumu gösterir.
