# Mimari

Frontend Next.js ile `frontend/` altında çalışır. Editör, JSON ile isteğe bağlı ZIP veya klasör medya dosyalarını FastAPI'ye gönderir.

Backend `backend/` altında FastAPI kullanır. Aktarımlar önce dosya sistemi staging alanına alınır, doğrulanır ve PostgreSQL/PostGIS `km` şemasına tek işlem olarak yazılır. Mevcut veya doğrulanamayan kayıtlar commit öncesinde engellenir; otomatik overwrite yapılmaz.

Public katalog API'si yalnız public erişimli ve reddedilmemiş kayıtları sayfalı olarak sunar. Arama; ad, alternatif ad, kimlik, ilişkili kayıt, malzeme ve teknik tablolarını kullanır. Facet'ler sınıflandırma, malzeme, teknik ve yer ilişkilerinden üretilir.

Yetkili şema kaynağı `database/schema/ana_ortak_kulturel_miras_veritabani.sql` dosyasıdır.
