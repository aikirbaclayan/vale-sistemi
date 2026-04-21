# Veritabanı Şeması (Supabase / Firebase Firestore için)

## 1. `vehicles` Tablosu
İşletmeye giriş yapmış ve henüz teslim edilmemiş aktif araçları tutar.

| Alan Adı      | Türü        | Açıklama                                      | Örnek                |
|---------------|-------------|-----------------------------------------------|----------------------|
| `id`          | `UUID`      | Benzersiz ID (Primary Key)                    | `cbf...`             |
| `plate`       | `Text`      | Normalize edilmiş plaka (Boşluksuz, büyük harf) | `34ABC123`           |
| `status`      | `Text`      | `parked`, `requested`, `preparing`, `ready`   | `requested`          |
| `vehicle_photo_url`| `Text` | Aracın fotoğrafının URL'i (isteğe bağlı)       | `https://.../img.png`|
| `location_note`  | `Text`      | Anahtarın konumu, park yeri vb. (isteğe bağlı) | `A3`                 |
| `check_in_at` | `Timestamp` | Aracın giriş saati                            | `2025-08-09T19:30:00Z`|
| `requested_at`| `Timestamp` | Müşterinin aracı çağırdığı saat (isteğe bağlı)| `2025-08-09T21:15:00Z`|
| `ready_at`    | `Timestamp` | Aracın hazır olduğu saat (isteğe bağlı)       | `2025-08-09T21:20:00Z`|
| `requested_in`| `Integer`   | Müşterinin kaç dk içinde istediği (5, 10, 15)  | `10`                 |
| `valet_notes` | `Text`      | Valenin gizli notları (isteğe bağlı)          | `Bebek koltuğu var`  |

## 2. `vehicle_logs` Tablosu
Teslim edilmiş araçların geçmişini tutar. Raporlama için kullanılır.

| Alan Adı        | Türü        | Açıklama                               |
|-----------------|-------------|----------------------------------------|
| `id`            | `UUID`      | Benzersiz ID                           |
| `plate`         | `Text`      | Plaka                                  |
| `check_in_at`   | `Timestamp` | Giriş saati                            |
| `check_out_at`  | `Timestamp` | Teslim (çıkış) saati                   |
| `total_stay_duration`| `Integer`| Toplam kalış süresi (dakika)          |
| `wait_time`     | `Integer`   | Çağrıdan hazırlığa geçen süre (dakika) |
| `valet_id`      | `Text`      | Teslim eden valenin ID'si (varsa)      |