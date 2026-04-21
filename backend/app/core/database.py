from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings
import logging

# Veritabanı engine oluştur
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # SQL sorgularını logla
    pool_pre_ping=True,   # Bağlantı kontrolü
    pool_recycle=300      # Bağlantı yenileme
)

def create_db_and_tables():
    """Veritabanı tablolarını oluştur"""
    try:
        SQLModel.metadata.create_all(engine)
        logging.info("✅ Veritabanı tabloları başarıyla oluşturuldu")
    except Exception as e:
        logging.error(f"❌ Veritabanı tabloları oluşturulurken hata: {e}")
        raise

def get_session():
    """Veritabanı session'ı oluştur"""
    with Session(engine) as session:
        yield session
