# Aktarım hattı

Editörde JSON, yalnız JSON; JSON + ZIP; veya JSON + görsel klasörü olarak yüklenir. Klasör seçiminde ve sürükle-bırakta göreli yollar kanonik `/` ayıracıyla korunur.

Backend paket biçimini, tablo izin listesini, ilişkileri, medya referanslarını, checksum/byte size değerlerini ve güvenli dosya yollarını doğrular. Staging başarılıysa yinelenen kayıt analizi yapılır. `existing > 0` veya `uncheckable > 0` olduğunda commit engellenir. Tamamı yeni kayıtlar tek veritabanı transaction'ı ile yazılır; hata halinde rollback uygulanır.
