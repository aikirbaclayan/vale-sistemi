# Sistemin Çalışma Kuralları ve Mantığı (SYSTEM_RULES.md)

Bu dosya, uygulamanın iş mantığını ve davranışlarını tanımlar. Kod üretilirken bu kurallara harfiyen uyulmalıdır.

---

### **Bölüm 1: Müşteri Arayüzü Kuralları (QR Sayfası)**

1.  **Plaka Doğrulama (En Kritik Kural):**
    - **Kural:** Müşteri, bir araç çağırma talebi göndermek için SADECE o gün `vehicles` tablosuna kaydedilmiş ve `status` alanı `'parked'` olan bir plakayı girebilir.
    - **Mantık:** Bu kural, sisteme sahte, yanlış veya henüz giriş yapmamış bir araç için talep gelmesini %100 engeller.
    - **Teknik Detay:** Plaka girişi `onChange` olayında anlık olarak veritabanında sorgulanmalıdır.

2.  **Arayüz Etkileşimi:**
    - **Kural:** Plaka doğrulanamazsa, süre (`5 dk`, `10 dk`, `15 dk`) butonları `disabled` (tıklanamaz) olmalı ve hata mesajı gösterilmelidir: "Bu plaka bugün sistemde yok. Lütfen valeyle teyit edin."
    - **Kural:** Plaka başarıyla doğrulanırsa, süre butonları anında aktif (tıklanabilir) hale gelmelidir.

3.  **Talep Gönderimi:**
    - **Kural:** Müşteri bir süre butonuna tıkladığında, ilgili `vehicles` kaydının `status` alanı `'requested'` olarak güncellenmelidir. `requested_at` alanına güncel zaman damgası, `requested_in` alanına ise müşterinin seçtiği süre (5, 10, 15) yazılmalıdır.
    - **Kural (İstisna):** Eğer bir araç için zaten bir çağrı varsa (status `requested` veya `preparing`), yeni gelen çağrı eskisinin üzerine yazılır. En son talep geçerlidir.

---

### **Bölüm 2: Vale Panosu Kuralları**

1.  **Durum Geçişleri (State Machine):**
    - Bir araç sadece şu akışta ilerleyebilir: `parked` -> `requested` -> `preparing` -> `ready`.
    - `ready` durumundaki bir araç "Teslim Edildi" butonuna basıldığında `vehicles` tablosundan silinir ve `vehicle_logs` tablosuna bir kayıt olarak eklenir.
    - **Mantık:** Bu sıralama, valenin yanlışlıkla bir adımı atlamasını (örneğin hazırlanmayan aracı hazır işaretlemesini) engeller.

2.  **Geri Sayım Halkası:**
    - **Kural:** Halka, `requested_at` zamanından başlar ve `requested_in` süresi dolana kadar dolar.
    - **Kural:** Sürenin %80'i dolduğunda halkanın rengi kehribar (uyarı), süre dolduğunda ise kırmızı (geç kaldı) olur.

3.  **Loyalty Yıldızı (⭐️):**
    - **Kural:** Bir plaka vale panosunda gösterilirken, bu plakanın `vehicle_logs` tablosundaki son 90 gündeki kayıt sayısı kontrol edilir. Eğer sayı 2 veya daha fazlaysa (yani bu 3. veya daha sonraki gelişi ise) plakanın yanında ⭐️ ikonu gösterilir.

---

### **Bölüm 3: Veri ve Arka Plan Kuralları**

1.  **Plaka Normalizasyonu:**
    - **Kural:** Sisteme giren (hem vale kaydı hem müşteri sorgusu) tüm plakalar veritabanına yazılmadan veya sorgulanmadan önce normalize edilmelidir: Tüm harfler büyük, tüm boşluklar ve tireler kaldırılmış.
    - **Örnek:** `34 abc 123` -> `34ABC123`

2.  **Raporlama Metrikleri Hesaplaması:**
    - **Kural:** `Ortalama Bekleme Süresi` = `(ready_at - requested_at)` değerlerinin ortalaması.
    - **Kural:** `Ortalama Toplam Kalış` = `(check_out_at - check_in_at)` değerlerinin ortalaması.

3.  **Veri Saklama:**
    - **Kural:** `vehicle_logs` tablosundaki veriler 90 gün sonra otomatik olarak silinebilir veya arşivlenebilir. `vehicles` tablosu ise sadece aktif araçları tuttuğu için sürekli temizlenir.

---
