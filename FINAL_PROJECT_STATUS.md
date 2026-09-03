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
