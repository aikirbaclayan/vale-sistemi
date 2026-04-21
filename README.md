# Vale Yönetim Sistemi

Restoran ve işletmeler için akıllı vale yönetim sistemi. Müşteriler masadan araçlarını çağırabilir, valeler araçları kanban tarzı bir panelde yönetebilir, işletme sahipleri ise detaylı raporlara erişebilir.

## Özellikler

### Müşteri Arayüzü (QR Sayfası)
- Plaka doğrulama sistemi
- 5/10/15 dakika seçenekleri
- Anlık geri bildirim
- Mobil uyumlu PWA

### Vale Paneli
- Kanban tarzı durum yönetimi
- Fotoğrafla araç tanıma
- Geri sayım halkası
- Loyalty sistemi (sık müşteri tanıma)
- Gizli vale notları
- Offline mod desteği

### İşletme Sahibi Paneli
- Günlük metrikler
- Saatlik yoğunluk haritası
- CSV rapor indirme
- WhatsApp günlük özeti
- Plaka düzeltme

## Teknoloji Yığını

### Frontend
- **React 18** + **TypeScript**
- **Tailwind CSS** (Responsive tasarım)
- **PWA** (Progressive Web App)
- **Axios** (HTTP istemcisi)

### Backend
- **FastAPI** + **Python 3.11**
- **SQLModel** (ORM)
- **PostgreSQL** (Veritabanı)
- **WhatsApp Business API**

### Deployment
- **Docker** + **Docker Compose**
- **Nginx** (Reverse proxy)
- **SSL/HTTPS** desteği

## Kurulum

### Gereksinimler
- Docker ve Docker Compose
- WhatsApp Business API hesabı (opsiyonel)

### Adım 1: Projeyi İndir
```bash
git clone https://github.com/aikirbaclayan/vale-sistemi.git
cd vale-sistemi
```

### Adım 2: Environment Dosyasını Oluştur
```bash
cp backend/env_example.txt backend/.env
```

Backend `.env` dosyasını düzenleyin:
```env
DATABASE_URL=postgresql://vale_user:vale_password@postgres:5432/vale_system
WHATSAPP_TOKEN=your_whatsapp_business_api_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token
OWNER_PHONE=your_phone_number_with_country_code
SECRET_KEY=your-strong-secret-key
```

### Adım 3: Uygulamayı Başlat
```bash
docker-compose up -d
```

### Adım 4: Erişim
- **Müşteri Sayfası**: http://localhost:3000
- **Vale Paneli**: http://localhost:3000/valet
- **İşletme Paneli**: http://localhost:3000/owner
- **API Dokümantasyonu**: http://localhost:8000/docs

## Kullanım

### 1. Vale Tarafından Araç Kaydı
1. Vale paneline girin (`/valet`)
2. Yeni araç ekle butonuna tıklayın
3. Plaka ve konum bilgilerini girin
4. Araç fotoğrafını çekin (opsiyonel)

### 2. Müşteri Araç Çağrısı
1. QR kodu okutarak sayfaya erişin
2. Plaka numaranızı girin
3. Kaç dakika içinde istediğinizi seçin
4. Onay mesajını bekleyin

### 3. Vale Araç Hazırlama
1. Vale panelinde çağrılan aracı görün
2. "Hazırlamaya Başla" → "Hazır" → "Teslim" akışını takip edin
3. Geri sayım halkasını izleyin
4. Gerekirse vale notu ekleyin

### 4. İşletme Raporlama
1. İşletme paneline girin (`/owner`)
2. Günlük metrikleri görüntüleyin
3. CSV rapor indirin
4. WhatsApp özeti gönderin

## Yapılandırma

### WhatsApp Business API Kurulumu
1. [Meta for Developers](https://developers.facebook.com/) hesabı oluşturun
2. WhatsApp Business API'ye başvurun
3. Phone Number ID ve Access Token alın
4. Webhook URL'ini ayarlayın: `https://yourdomain.com/api/v1/whatsapp/webhook`

### SSL Sertifikası (Production)
```bash
mkdir -p nginx/ssl
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem
```

## Geliştirme

### Frontend
```bash
cd frontend
npm install
npm start
```

### Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

### Veritabanı Migration
```bash
docker exec -it vale_backend bash
alembic revision --autogenerate -m "migration_adi"
alembic upgrade head
```

## API Endpoints

### Müşteri
- `GET /api/v1/customer/validate-plate/{plate}` - Plaka doğrulama
- `POST /api/v1/customer/request-vehicle` - Araç çağrı talebi
- `GET /api/v1/customer/vehicle-status/{plate}` - Araç durumu

### Vale
- `GET /api/v1/valet/vehicles` - Tüm araçları listele
- `POST /api/v1/valet/vehicles` - Yeni araç ekle
- `PUT /api/v1/valet/vehicles/{id}/status` - Durum güncelle
- `POST /api/v1/valet/vehicles/{id}/deliver` - Teslim et
- `POST /api/v1/valet/vehicles/{id}/photo` - Fotoğraf yükle

### İşletme
- `GET /api/v1/owner/metrics` - Günlük metrikler
- `GET /api/v1/owner/report/{date}` - CSV rapor
- `POST /api/v1/owner/send-daily-summary` - WhatsApp özeti
- `PUT /api/v1/owner/vehicles/{id}/correct-plate` - Plaka düzelt

## Güvenlik

- Rate limiting
- CORS yapılandırması
- SQL injection koruması (SQLModel)
- XSS koruması
- Dosya yükleme güvenliği

> **Önemli:** `.env` dosyanızı asla Git'e yüklemeyin. `env_example.txt` dosyasını şablon olarak kullanın.

## Sistem Kuralları

### Plaka Doğrulama
- Sadece o gün sistemde kayıtlı plakalar kabul edilir
- Plaka normalizasyonu: boşluklar ve tireler kaldırılır
- Türk plaka formatı kontrolü

### Durum Geçişleri
```
PARKTA → ÇAĞRILDI → HAZIRLANIYOR → HAZIR → TESLİM
```

### Loyalty Sistemi
- Son 90 günde 3+ ziyaret = loyalty müşteri
- Otomatik hesaplama ve gösterim

## Sorun Giderme

### Docker Sorunları
```bash
docker-compose down
docker-compose up -d

# Logları kontrol et
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Veritabanı Sorunları
```bash
docker exec -it vale_postgres psql -U vale_user -d vale_system
\dt
```

### Frontend Build Sorunları
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
