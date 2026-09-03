# Production deployment

MirasExplorer üç production bileşenine ihtiyaç duyar: Next.js frontend, FastAPI backend ve PostgreSQL/PostGIS veritabanı. Frontend tek başına yayınlanmamalıdır.

## Environment variables

Frontend runtime/build ortamında `NEXT_PUBLIC_API_BASE_URL`, public FastAPI URL'sini göstermelidir. Backend ortamında `DATABASE_URL` production PostgreSQL/PostGIS bağlantısını, `CORS_ORIGINS` ise virgülle ayrılmış kesin frontend domainlerini içerir. Secret değerler kaynak dosyasına, Git'e veya release paketine konulmaz.

## Database

Yeni production veritabanında `database/schema/ana_ortak_kulturel_miras_veritabani.sql` bir kez uygulanır. PostGIS etkin olmalı ve `km` şemasında 33 temel tablo doğrulanmalıdır. Mevcut production verisine destructive schema işlemi uygulanmaz.

## Media

Mevcut aktarım medyası backend dosya sistemi staging alanında bulunur. Production için kalıcı, yedekli object storage veya kalıcı disk bağlanmadan medya içeren katalog yayınlanmamalıdır; ephemeral container diski kalıcı depolama değildir. Backend servisinde bu storage, import staging ve public `/api/public/media/{id}` erişimini aynı kalıcı volume veya object-storage katmanına bağlamalıdır.

## Release and smoke test

Önce backend `/health`, sonra `/api/public/assets`, `/api/public/facets`, seçili bir `/api/public/assets/{id}` ve varsa media URL'si kontrol edilir. Ardından frontend `/ara` ile bir gerçek kart ve `/eser/{id}` açılır. CORS yalnız production frontend URL'si için doğrulanır.

## Rollback

Önceki frontend/backend sürümüne dönülür; veritabanı şeması veya kayıtlar silinmez. Yeni schema değişikliği yalnız ileri uyumlu ve ayrı onaylı migration ile uygulanır.
