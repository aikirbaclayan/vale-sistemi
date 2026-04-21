from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.api_v1.api import api_router
from app.core.database import create_db_and_tables
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.services.whatsapp import whatsapp_service
from app.core.config import settings

# FastAPI uygulaması oluştur
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Restoran ve işletmeler için akıllı vale yönetim sistemi",
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware ekle
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Statik dosya servisi (fotoğraflar için)
# Ortam değişkeninden gelen `UPLOAD_DIR` kullanılır (örn: /data/uploads)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# API router'ları ekle
app.include_router(api_router, prefix="/api/v1")

# Başlangıç olayları
@app.on_event("startup")
async def startup_event():
    """Uygulama başlatıldığında çalışacak fonksiyonlar"""
    # Veritabanı tablolarını oluştur
    create_db_and_tables()
    print(f"🚀 {settings.APP_NAME} başlatıldı!")
    print(f"📖 API Dokümantasyonu: http://localhost:8000/docs")

    # Gün sonu özeti zamanlayıcı
    try:
        scheduler = AsyncIOScheduler()
        hh, mm = settings.DAILY_SUMMARY_TIME.split(":")
        async def send_summary_job():
            from fastapi.encoders import jsonable_encoder
            from sqlmodel import select
            from app.core.database import get_session
            from app.models.vehicle import Vehicle, VehicleLog
            from app.core.utils import get_hourly_distribution
            from datetime import datetime
            # Basit, DB erişimi için ayrı bir session oluştur
            try:
                from sqlmodel import Session
                from app.core.database import engine
                with Session(engine) as session:
                    today = datetime.now().date()
                    start_datetime = datetime.combine(today, datetime.min.time())
                    end_datetime = datetime.combine(today, datetime.max.time())
                    logs = session.exec(
                        select(VehicleLog).where(
                            VehicleLog.check_in_at >= start_datetime,
                            VehicleLog.check_in_at <= end_datetime,
                        )
                    ).all()
                    parked_vehicles = session.exec(select(Vehicle)).all()
                    total_cars = len(logs)
                    parked_now = len(parked_vehicles)
                    wait_times = [log.wait_time for log in logs if log.wait_time is not None]
                    avg_wait = int(sum(wait_times) / len(wait_times)) if wait_times else 0
                    stay_times = [log.total_stay_duration for log in logs]
                    avg_stay = int(sum(stay_times) / len(stay_times)) if stay_times else 0
                    hourly_data = get_hourly_distribution(logs)
                    peak = max(hourly_data, key=lambda x: x["count"]) if hourly_data else {"hour": 0, "count": 0}
                    summary_text = f"""📊 *Günlük Vale Raporu* - {today.strftime('%d.%m.%Y')}

🚗 *Toplam Araç:* {total_cars}
🅿️ *Şu An Parkta:* {parked_now}
⏱️ *Ortalama Bekleme:* {avg_wait} dk
🕒 *Ortalama Kalış:* {avg_stay} dk
📈 *En Yoğun Saat:* {peak['hour']:02d}:00 ({peak['count']} araç)

Vale Yönetim Sistemi 🚀"""
                    if settings.OWNER_PHONE:
                        await whatsapp_service.send_message(settings.OWNER_PHONE, summary_text, "text")
            except Exception as e:
                print("Gün sonu özeti job hatası:", e)

        scheduler.add_job(send_summary_job, CronTrigger(hour=int(hh), minute=int(mm)))
        scheduler.start()
    except Exception as e:
        print("Scheduler başlatılamadı:", e)

# Sağlık kontrolü endpoint'i
@app.get("/health")
async def health_check():
    """API sağlık kontrolü"""
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION
    }

# Ana sayfa
@app.get("/")
async def root():
    """Ana sayfa - API bilgileri"""
    return {
        "message": f"Hoş geldiniz! {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health"
    }
