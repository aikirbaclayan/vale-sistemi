-- PostgreSQL için başlangıç SQL dosyası
-- Bu dosya Docker container başlatıldığında otomatik çalışır

-- Veritabanı zaten docker-compose.yml'de oluşturuluyor
-- Burada sadece ek yapılandırmalar yapabiliriz

-- UUID extension'ını etkinleştir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Türkçe collation ayarları
-- SET lc_collate = 'tr_TR.UTF-8';
-- SET lc_ctype = 'tr_TR.UTF-8';

-- Timezone ayarı
SET timezone = 'Europe/Istanbul';

-- Performans için bazı ayarlar
-- VACUUM ve ANALYZE işlemlerini otomatik yap
-- Bu ayarlar production ortamında daha dikkatli yapılmalı

-- Unique index: vehicles.plate (uygulama modeli unique ama DB seviyesi garanti)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ix_vehicles_plate_unique'
    ) THEN
        CREATE UNIQUE INDEX ix_vehicles_plate_unique ON public.vehicles (plate);
    END IF;
EXCEPTION WHEN undefined_table THEN
    -- Tablo ilk migration'da oluşmuyorsa, uygulama açılışında alembic/SQLModel oluşturacak
    -- Bu durumda index oluşturma daha sonra manuel uygulanabilir.
    RAISE NOTICE 'Table vehicles does not exist yet; unique index will be created after table creation.';
END
$$;