Harika—tek şube / tek işletme için “müşteri masadan kalkmadan çağırır” akışını aşırı net ve kodsuz anlatıyorum. Aşağıdaki metin direkt tasarım + ürün dokümanı gibi; içinde API/DB vs. yok.

0) Amaç (net)
Müşteri masadayken arabasını çağırır.

Vale yalnızca plaka ve araç görseli ile çalışır; müşteri telefonu valeye görünmez.

İşletme sahibi gün sonunda adet ve süre metriklerini görür (nakit vale ücreti kontrolü).

Hata ve karmaşa engeli: Müşteri sadece vale tarafından önceden kaydedilmiş plaka ile talep oluşturabilir.

1) Roller & Görünürlük
Müşteri: QR sayfası (plaka giriş + 5/10/15 dk çağrı, durum onayı,).

Vale: Pano (Parkta / Çağrıldı / Hazırlanıyor / Hazır), foto küçük görselleri, hızlı aksiyonlar, gizli vale notları.

İşletme Sahibi: Günlük adet, çağrı→hazır ortalama, toplam kalış ortalama, pik saat şeridi, vale performansı, loyalty sinyali, CSV indir, gün sonu WhatsApp özeti.

2) QR Sayfası — Plaka Doğrulamalı Çağrı (kodsuz kurallar)
2.1 Ekran bileşenleri
Başlık: “Arabanızı masadan çağırın”

Plaka alanı: Tek satır, otomatik büyük harf, yazarken boşluk/tireleri yok sayar.

Süre butonları: 5 dk • 10 dk • 15 dk (başta pasif).



Mini bilgi satırı: “Numaranız valeye gösterilmez.”

2.2 Plaka doğrulama kuralı (kritik)
Müşteri yazarken sistem, o gün valenin açtığı kayıtlı plakalar listesiyle bire bir eşleştirme yapar.

Eşleşirse: Süre butonları aktif olur; tıklanınca talep gönderilir.

Eşleşmezse: Süre butonları pasif kalır ve kırmızı uyarı görünür:

Hata metni: “Bu plaka bugün sistemde yok. Lütfen valeyle teyit edin.”

Deneme sınırı (isteğe bağlı): 3 kez başarısız denemeden sonra 2 dakika bekleme mesajı.

Biçim toleransı: 34 abc 123 / 34-ABC-123 / 34abc123 → hepsi kabul, sistem kendi içinde 34ABC123 gibi normalize eder.

2.3 Gönderim sonrası geri bildirim
Onay bandı (yeşil, üstte): “Talebiniz alındı. Sıranız: #2 — tahmini 6 dk.”

“Hazır” bildirimi geldiğinde sayfada küçük yeşil rozet: “Aracınız hazır — teslim noktasına geliniz.”

WhatsApp yoksa (müşteri telefonunda uygulama kapalı/kurulu değil): “Çağrınız alınamadı, lütfen valeye bildiriniz.” kısa metni gösterilir.

3) Vale Pano — Mikro-UX ve akış
3.1 Sütunlar ve renkli durum çipleri
Sütunlar: Parkta → Çağrıldı → Hazırlanıyor → Hazır

Durum çipleri:

Parkta = Gri, Çağrıldı = Kehribar, Hazırlanıyor = Mavi, Hazır = Yeşil

Çip metinleri kısa ve büyük: “ÇAĞRILDI”, “HAZIR”

3.2 Kart yapısı (tek bakışta anlaşılır)
Plaka (büyük ve kalın) + alt satırda araç rengi/slot ( Anahtarın konumu).

Geri sayım halkası (Çağrı→Hazır için); altında geçen süre mm:ss. görselin etrafında

Durum çipi + tek dokunuş makro butonu. kartın alt kısmında 

Küçük görsel: Vale park sonrası çekilen önden araç fotoğrafı minik önizleme olarak daire şeklinde 

3.3 Fotoğrafla arabayı bulma
Vale, aracı park ettikten sonra önden plaka görünür tek foto çeker.

Kartta thumbnail çıkar; liste içinde gözle hızlı ayırt edilmesini sağlar.

Küçük görsele dokununca büyük önizleme açılır (karanlık overlay, tek dokunuş kapanır).

Not: Foto çekimi zorunlu değil, yavaş bağlantıda atlanabilir. “Plaka okunur görünmüyorsa flaşı açın” mini ipucu verilir.

3.4 Geri sayım halkası + ‘ding’ uyarı
Halka çağrı anından seçilen süre bitimine kadar ince bir çember olarak doluyor.

%80 dolumdan sonra renk kehribar tonuna, süre dolunca kırmızı kenarlığa geçer.

Kısa “ding” sesi ve hafif titreşim (Android PWA) sadece ilk çağrı anında ve süre dolduğunda birer kez çalar.

Header’da 🔔 Bildirimler anahtarı ile tek tık kapatılabilir/açılabilir.

3.5 Hızlı arama & makrolar
Son 3 hane arama: “123” yazınca …123 ile biten plakalar kalır, diğerleri silikleşir.

Makrolar (duruma göre tek büyük buton):

Çağrıldı → “Hazırlamaya Başla”

Hazırlanıyor → “Hazır”

Hazır → “Teslim”

Tıklamada hızlı vizüel geri bildirim (kısa parıltı). Bağlantı yavaşsa “Güncelleniyor…” bantı gösterilir, işlem bitince kaybolur.

3.6 Loyalty ⭐️ ve gizli vale notları
Loyalty yıldızı: Son 90 günde 3+ kez gelen plakaların kart başlığında ⭐️ belirir.
Tooltip: “Bu plaka 3+ kez geldi.”

Vale notları (gizli): Kartta küçük 📝 ikonu; dokununca mini not çekmecesi açılır.

Hazır çipler: “Bebek koltuğu”, “Dikkatli sür”, “Cam açık geldi”… (düzenlenebilir kısa etiketler)

Serbest kısa not: 160 karakter sınırı.

Uyarı metni (küçük): “Bu notları işletme sahibi göremez. .”

3.7 Offline modu
İnternet kesilirse üstte sarı bant: “Offline — işlemler sıraya alındı.”

İşlemler sıradayken kartlar gri noktalı kenarlık alır. Bağlantı gelince bant kapanır.

4) İşletme Sahibi Paneli — Rapor & Özet
4.1 Canlı sayaç ve küçük ayrıntı çekmecesi
Topbar’da: “Bugün: 37 araç”

Tıklayınca küçük çekmece:

Giren: 41

Çıkan: 37

Şu an parkta: 4

4.2 Temel metrikler (günlük)
Günlük araç sayısı (giriş/çıkış)

Ortalama bekleme (Çağrı→Hazır)

Ortalama toplam kalış (Giriş→Çıkış)

Vale performansı (hazıra alma süresi, teslim adedi)

Loyalty oranı (tekrar gelen plakaların yüzdesi)

4.3 Pik saat ısı şeridi
0–24 arası ince bir şerit; koyu segmentler yoğun saatleri gösterir.

Üzerine gelince “14:00–15:00 • 9 araç” gibi küçük ipucu metni.



4.5 CSV indirme
Tarih seçici (varsayılan: bugün) → İndir

Dosya adı: rapor_YYYY-AA-GG.csv

İçerik: Plaka, giriş, çağrı, hazır, teslim, kalış süresi, bekleme süresi, valenin adı (telefon yok).

5) Ekran Yazıları (hazır kopya)
5.1 QR sayfası
Başlık: “Arabanızı masadan çağırın”

Plaka alanı placeholder: “34ABC123”

Mini bilgi: “Numaranız valeye gösterilmez.”

Süre butonları: “5 dk”, “10 dk”, “15 dk”

Hata (plaka yok): “Bu plaka bugün sistemde yok. Lütfen valeyle teyit edin.”

Onay bandı: “Talebiniz alındı. Sıranız: #{{sıra}} — tahmini {{dk}} dk.”

Hazır bildirimi: “Aracınız hazır — teslim noktasına geliniz.”

Teslim noktası linki: “Harita”

5.2 Vale kartı
Makrolar: “Hazırlamaya Başla” • “Hazır” • “Teslim”

Loyalty ipucu: “Bu plaka 3+ kez geldi.”

Not çekmecesi alt uyarı: “Bu notları işletme sahibi göremez. Kişisel veri yazmayın.”

5.3 Sahip paneli
Sayaç: “Bugün: {{adet}} araç”



CSV: “CSV indir”

6) Kurallar & Edge-Case’ler (kodsuz)
Plaka doğrulama: QR sayfası yalnızca o gün önceden kayıtlı plakaları kabul eder.

Yanlış plaka düzeltme: Sadece işletme sahibi “Plakayı düzelt” yapabilir (vale değiştiremez).

Çoklu çağrı: Aynı araç için birden fazla çağrı gelirse en sonuncusu geçerlidir; önceki talepler görselde gri rozet olarak not edilir.

Eski link: 24 saatten eski çağrı linki “Süresi doldu” mesajı gösterir.

WhatsApp yoksa: “Çağrınız alınamadı, lütfen valeye bildiriniz.”

Telefon gizliliği: Müşteri numarası valeye hiçbir yerde gösterilmez.

Süre hedefi: Seçenekten bağımsız yoğunlukta sistem tahmini süreyi onay mesajında güncelleyebilir (ör. “~12 dk”).

7) Ayarlar (işletme sahibi için)


Bildirimler: “Ding sesini varsayılan açık/kapat”

Loyalty eşiği: “Kaçıncı gelişte ⭐️ gösterilsin?” (varsayılan: 3)

Veri saklama: “Ziyaret geçmişi ve süre verileri 90 gün saklanır.”

Gün sonu özeti: Manuel buton; istenirse “otomatik gönder” aç/kapa (kapanış saati seçimi).

8) “Bitmiş” sayılma kriterleri (Kabul)
Müşteri kayıtlı olmayan plaka ile asla talep oluşturamaz.

Doğru plaka girildiğinde süre butonları anında aktif olur.

Onay bandında sıra ve tahmini dakika görünür.

Vale kartında foto küçük görsel net; büyütme tek dokunuşla açılıp kapanır.

Geri sayım halkası doğru süreyi takip eder; dolunca kırmızı kenar + “ding”.

Loyalty yıldızı sadece 3+ ziyaret plakalarında görünür.

Gün sonu mesajı, paneldeki sayılarla bire bir tutarlıdır.

CSV tek tıkla iner; metrikler paneldekiyle aynı çıkar.

Offline bant bağlantı kesildiğinde görünür; bağlantı gelince kaybolur.



