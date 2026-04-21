import re
from datetime import datetime, timedelta
from typing import List, Optional
import os
import uuid
from fastapi import UploadFile
from app.core.config import settings

def normalize_plate(plate: str) -> str:
    """
    Plaka normalizasyonu
    Örnek: "34 abc 123" -> "34ABC123"
    """
    # Sadece alfanümerik karakterleri al ve büyük harfe çevir
    normalized = re.sub(r'[^a-zA-Z0-9]', '', plate).upper()
    return normalized

def validate_plate_format(plate: str) -> bool:
    """
    Türk plaka formatını doğrula
    Örnekler: 34ABC123, 06XY1234, 35A1234
    """
    normalized = normalize_plate(plate)
    
    # Türk plaka formatları
    patterns = [
        r'^[0-9]{2}[A-Z]{1,3}[0-9]{1,4}$',  # Yeni format: 34ABC123, 35A1234
        r'^[0-9]{2}[A-Z]{2}[0-9]{3,4}$',    # Eski format: 34AB123, 34AB1234
    ]
    
    return any(re.match(pattern, normalized) for pattern in patterns)

def calculate_duration_minutes(start_time: datetime, end_time: Optional[datetime] = None) -> int:
    """İki tarih arasındaki farkı dakika olarak hesapla"""
    if end_time is None:
        end_time = datetime.now()
    
    duration = end_time - start_time
    return int(duration.total_seconds() / 60)

def get_time_category(hour: int) -> str:
    """Saati kategoriye göre grupla"""
    if 6 <= hour < 12:
        return "sabah"
    elif 12 <= hour < 18:
        return "öğlen"
    elif 18 <= hour < 24:
        return "akşam"
    else:
        return "gece"

def generate_filename(original_filename: str) -> str:
    """Benzersiz dosya adı oluştur"""
    ext = os.path.splitext(original_filename)[1].lower()
    unique_name = f"{uuid.uuid4()}{ext}"
    return unique_name

async def save_upload_file(upload_file: UploadFile, folder: str = "vehicles") -> str:
    """Yüklenen dosyayı kaydet ve URL döndür"""
    # Dosya uzantısını kontrol et
    ext = os.path.splitext(upload_file.filename)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise ValueError(f"Desteklenmeyen dosya formatı: {ext}")
    
    # Dosya boyutunu kontrol et
    content = await upload_file.read()
    if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise ValueError(f"Dosya boyutu {settings.MAX_FILE_SIZE_MB}MB'dan büyük olamaz")
    
    # Klasör oluştur
    folder_path = os.path.join(settings.UPLOAD_DIR, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    # Benzersiz dosya adı oluştur
    filename = generate_filename(upload_file.filename)
    file_path = os.path.join(folder_path, filename)
    
    # Dosyayı kaydet
    with open(file_path, "wb") as f:
        f.write(content)
    
    # URL döndür
    return f"/uploads/{folder}/{filename}"

def format_plate_for_display(plate: str) -> str:
    """
    Plakayı görsel için formatla
    Örnek: "34ABC123" -> "34 ABC 123"
    """
    normalized = normalize_plate(plate)
    
    if len(normalized) >= 7:
        # 34ABC123 -> 34 ABC 123
        return f"{normalized[:2]} {normalized[2:5]} {normalized[5:]}"
    elif len(normalized) >= 5:
        # 34AB123 -> 34 AB 123
        return f"{normalized[:2]} {normalized[2:4]} {normalized[4:]}"
    
    return normalized

def get_hourly_distribution(logs: List) -> List[dict]:
    """Saatlik dağılımı hesapla"""
    hourly_counts = {hour: 0 for hour in range(24)}
    
    for log in logs:
        hour = log.check_in_at.hour
        hourly_counts[hour] += 1
    
    return [{"hour": hour, "count": count} for hour, count in hourly_counts.items()]

def calculate_loyalty_rate(all_plates: List[str], logs: List) -> float:
    """Loyalty oranını hesapla"""
    if not all_plates:
        return 0.0
    
    # Son 90 gün içinde 3+ kez gelen plakalar
    ninety_days_ago = datetime.now() - timedelta(days=90)
    recent_logs = [log for log in logs if log.check_in_at >= ninety_days_ago]
    
    plate_counts = {}
    for log in recent_logs:
        plate_counts[log.plate] = plate_counts.get(log.plate, 0) + 1
    
    loyal_plates = sum(1 for count in plate_counts.values() if count >= 3)
    total_unique_plates = len(set(all_plates))
    
    if total_unique_plates == 0:
        return 0.0
    
    return round((loyal_plates / total_unique_plates) * 100, 1)

def generate_csv_content(logs: List) -> str:
    """CSV içeriği oluştur"""
    headers = [
        "Plaka", "Giriş Saati", "Çağrı Saati", "Hazır Saati", 
        "Teslim Saati", "Kalış Süresi (dk)", "Bekleme Süresi (dk)", "Vale ID"
    ]
    
    rows = [",".join(headers)]
    
    for log in logs:
        row = [
            format_plate_for_display(log.plate),
            log.check_in_at.strftime("%d.%m.%Y %H:%M"),
            "-",  # Çağrı saati (log tablosunda yok)
            "-",  # Hazır saati (log tablosunda yok)
            log.check_out_at.strftime("%d.%m.%Y %H:%M"),
            str(log.total_stay_duration),
            str(log.wait_time) if log.wait_time else "-",
            log.valet_id or "-"
        ]
        rows.append(",".join(row))
    
    return "\n".join(rows)

def is_loyal_customer(plate: str, logs: List, days: int = 90, min_visits: int = 3) -> bool:
    """Müşterinin sadık müşteri olup olmadığını kontrol et"""
    cutoff_date = datetime.now() - timedelta(days=days)
    recent_visits = [
        log for log in logs 
        if log.plate == plate and log.check_in_at >= cutoff_date
    ]
    return len(recent_visits) >= min_visits - 1  # Mevcut ziyaret dahil

def normalize_phone_for_whatsapp(phone: str) -> str:
    """
    WhatsApp API için telefon numarasını normalize et.
    Girdi örnekleri: "+90 5xx xxx xx xx", "0(5xx)xxx xx xx", "905xx..."
    Çıktı: "905xxxxxxxxx"
    """
    if not phone:
        return phone
    digits = re.sub(r"[^0-9]", "", phone)
    # Başında 00 varsa 0'a çevir
    if digits.startswith("00"):
        digits = digits[2:]
    # Türkiye için 0 ile başlıyorsa kaldır
    if digits.startswith("0"):
        digits = digits[1:]
    # Ülke kodu yoksa 90 ekle
    if not digits.startswith("90"):
        digits = "90" + digits
    return digits