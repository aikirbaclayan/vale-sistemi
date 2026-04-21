from typing import List
from pydantic_settings import BaseSettings
from pydantic import field_validator
import os

class Settings(BaseSettings):
    """Uygulama ayarları"""
    
    # Uygulama temel ayarları
    APP_NAME: str = "Vale Yönetim Sistemi"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Veritabanı
    DATABASE_URL: str = "postgresql://vale_user:vale_password@postgres:5432/vale_system"
    
    # Güvenlik
    SECRET_KEY: str = "your-super-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080"
    ]

    # .env içinde CORS_ORIGINS virgül ayrılmış string gelirse listeye dönüştür
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            # JSON array verilmişse pydantic zaten parse eder; burada virgül ayrılmışı destekliyoruz
            parts = [item.strip() for item in v.split(",") if item.strip()]
            return parts
        return v
    
    # WhatsApp Business API
    WHATSAPP_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: str = ""
    
    # Dosya yükleme
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 5
    ALLOWED_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".webp"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # İşletme sahibi WhatsApp numarası (örn: 9055xxxxxxx)
    OWNER_PHONE: str = ""
    
    # Gün sonu özeti saati (HH:MM)
    DAILY_SUMMARY_TIME: str = "22:30"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Global settings instance
settings = Settings()

# Upload klasörünü oluştur
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
