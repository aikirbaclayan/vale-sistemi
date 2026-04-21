from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select, func
from typing import Dict, Any, List
from datetime import datetime, date, timedelta
import io

from app.core.database import get_session
from app.models.vehicle import Vehicle, VehicleLog, VehicleStatus
from app.core.utils import (
    calculate_duration_minutes, get_hourly_distribution,
    calculate_loyalty_rate, generate_csv_content, normalize_plate
)
from pydantic import BaseModel
from app.services.whatsapp import whatsapp_service
from app.core.config import settings

router = APIRouter()

# Response modelleri
class ApiResponse(BaseModel):
    success: bool
    data: Any = None
    error: str = None

class OwnerMetrics(BaseModel):
    todayCount: int
    parkedCount: int
    avgWaitTime: int
    avgStayTime: int
    loyaltyRate: float
    hourlyData: List[Dict[str, int]]

class PlateCorrection(BaseModel):
    plate: str

@router.get("/metrics")
async def get_metrics(
    date: str = None,
    session: Session = Depends(get_session)
) -> ApiResponse:
    """Günlük metrikleri getir"""
    try:
        # Tarih belirleme
        if date:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        else:
            target_date = datetime.now().date()
        
        start_datetime = datetime.combine(target_date, datetime.min.time())
        end_datetime = datetime.combine(target_date, datetime.max.time())
        
        # Günlük log kayıtlarını getir
        logs_statement = select(VehicleLog).where(
            VehicleLog.check_in_at >= start_datetime,
            VehicleLog.check_in_at <= end_datetime
        )
        logs = session.exec(logs_statement).all()
        
        # Şu an parkta olan araçları getir
        parked_statement = select(Vehicle)
        parked_vehicles = session.exec(parked_statement).all()
        
        # Temel metrikler
        today_count = len(logs)
        parked_count = len(parked_vehicles)
        
        # Ortalama bekleme süresi
        wait_times = [log.wait_time for log in logs if log.wait_time is not None]
        avg_wait_time = int(sum(wait_times) / len(wait_times)) if wait_times else 0
        
        # Ortalama kalış süresi
        stay_times = [log.total_stay_duration for log in logs]
        avg_stay_time = int(sum(stay_times) / len(stay_times)) if stay_times else 0
        
        # Saatlik dağılım
        hourly_data = get_hourly_distribution(logs)
        
        # Loyalty oranı (son 90 gün)
        ninety_days_ago = datetime.now() - timedelta(days=90)
        all_logs_statement = select(VehicleLog).where(
            VehicleLog.check_in_at >= ninety_days_ago
        )
        all_logs = session.exec(all_logs_statement).all()
        
        # Bugünkü benzersiz plakalar
        today_plates = list(set([log.plate for log in logs]))
        loyalty_rate = calculate_loyalty_rate(today_plates, all_logs)
        
        metrics = OwnerMetrics(
            todayCount=today_count,
            parkedCount=parked_count,
            avgWaitTime=avg_wait_time,
            avgStayTime=avg_stay_time,
            loyaltyRate=loyalty_rate,
            hourlyData=hourly_data
        )
        
        return ApiResponse(success=True, data=metrics.dict())
        
    except Exception as e:
        return ApiResponse(success=False, error=str(e))

@router.get("/report/{date}")
async def download_report(
    date: str,
    session: Session = Depends(get_session)
):
    """CSV rapor indirme"""
    try:
        # Tarihi parse et
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
        start_datetime = datetime.combine(target_date, datetime.min.time())
        end_datetime = datetime.combine(target_date, datetime.max.time())
        
        # Log kayıtlarını getir
        logs_statement = select(VehicleLog).where(
            VehicleLog.check_in_at >= start_datetime,
            VehicleLog.check_in_at <= end_datetime
        ).order_by(VehicleLog.check_in_at)
        
        logs = session.exec(logs_statement).all()
        
        # CSV içeriği oluştur
        csv_content = generate_csv_content(logs)
        
        # Dosya adı
        filename = f"rapor_{date.replace('-', '_')}.csv"
        
        # CSV response
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Geçersiz tarih formatı. YYYY-MM-DD kullanın.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-daily-summary")
async def send_daily_summary(
    session: Session = Depends(get_session)
) -> ApiResponse:
    """WhatsApp günlük özeti gönder"""
    try:
        # Bugünün metriklerini al
        today = datetime.now().date()
        start_datetime = datetime.combine(today, datetime.min.time())
        end_datetime = datetime.combine(today, datetime.max.time())
        
        # Günlük verileri getir
        logs_statement = select(VehicleLog).where(
            VehicleLog.check_in_at >= start_datetime,
            VehicleLog.check_in_at <= end_datetime
        )
        logs = session.exec(logs_statement).all()
        
        # Şu an parkta olan araçlar
        parked_statement = select(Vehicle)
        parked_vehicles = session.exec(parked_statement).all()
        
        # Özet metinini hazırla
        total_cars = len(logs)
        parked_now = len(parked_vehicles)
        
        wait_times = [log.wait_time for log in logs if log.wait_time is not None]
        avg_wait = int(sum(wait_times) / len(wait_times)) if wait_times else 0
        
        stay_times = [log.total_stay_duration for log in logs]
        avg_stay = int(sum(stay_times) / len(stay_times)) if stay_times else 0
        
        # En yoğun saat
        hourly_data = get_hourly_distribution(logs)
        peak_hour_data = max(hourly_data, key=lambda x: x['count']) if hourly_data else {'hour': 0, 'count': 0}
        
        summary_text = f"""📊 *Günlük Vale Raporu* - {today.strftime('%d.%m.%Y')}

🚗 *Toplam Araç:* {total_cars}
🅿️ *Şu An Parkta:* {parked_now}
⏱️ *Ortalama Bekleme:* {avg_wait} dk
🕒 *Ortalama Kalış:* {avg_stay} dk
📈 *En Yoğun Saat:* {peak_hour_data['hour']:02d}:00 ({peak_hour_data['count']} araç)

Vale Yönetim Sistemi 🚀"""
        # WhatsApp gönderimi
        if settings.OWNER_PHONE:
            await whatsapp_service.send_message(settings.OWNER_PHONE, summary_text, "text")
            return ApiResponse(success=True, data=True)
        else:
            return ApiResponse(success=False, error="OWNER_PHONE not set")
        
    except Exception as e:
        return ApiResponse(success=False, error=str(e))

@router.put("/vehicles/{vehicle_id}/correct-plate")
async def correct_plate(
    vehicle_id: str,
    correction: PlateCorrection,
    session: Session = Depends(get_session)
) -> ApiResponse:
    """Plaka düzeltme (sadece işletme sahibi)"""
    try:
        # Aracı bul
        vehicle = session.get(Vehicle, vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Araç bulunamadı")
        
        # Yeni plakayı normalize et
        new_plate = normalize_plate(correction.plate)
        
        # Aynı plaka var mı kontrol et
        existing_statement = select(Vehicle).where(
            Vehicle.plate == new_plate,
            Vehicle.id != vehicle_id
        )
        existing_vehicle = session.exec(existing_statement).first()
        
        if existing_vehicle:
            raise HTTPException(status_code=400, detail="Bu plaka zaten başka bir araçta kayıtlı")
        
        # Plakayı güncelle
        old_plate = vehicle.plate
        vehicle.plate = new_plate
        
        session.add(vehicle)
        session.commit()
        session.refresh(vehicle)
        
        # Response data
        vehicle_data = {
            "id": vehicle.id,
            "plate": vehicle.plate,
            "status": vehicle.status,
            "vehicle_photo_url": vehicle.vehicle_photo_url,
            "location_note": vehicle.location_note,
            "check_in_at": vehicle.check_in_at.isoformat(),
            "requested_at": vehicle.requested_at.isoformat() if vehicle.requested_at else None,
            "ready_at": vehicle.ready_at.isoformat() if vehicle.ready_at else None,
            "requested_in": vehicle.requested_in,
            "valet_notes": vehicle.valet_notes
        }
        
        return ApiResponse(success=True, data=vehicle_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard-summary")
async def get_dashboard_summary(
    session: Session = Depends(get_session)
) -> ApiResponse:
    """Dashboard için hızlı özet"""
    try:
        # Bugün
        today = datetime.now().date()
        start_datetime = datetime.combine(today, datetime.min.time())
        end_datetime = datetime.combine(today, datetime.max.time())
        
        # Günlük toplam
        logs_count = session.exec(
            select(func.count(VehicleLog.id)).where(
                VehicleLog.check_in_at >= start_datetime,
                VehicleLog.check_in_at <= end_datetime
            )
        ).one()
        
        # Şu an parkta
        parked_count = session.exec(select(func.count(Vehicle.id))).one()
        
        # Çağrı bekleyen
        requested_count = session.exec(
            select(func.count(Vehicle.id)).where(
                Vehicle.status.in_([VehicleStatus.REQUESTED, VehicleStatus.PREPARING])
            )
        ).one()
        
        summary = {
            "todayTotal": logs_count,
            "currentlyParked": parked_count,
            "awaitingService": requested_count,
            "date": today.isoformat()
        }
        
        return ApiResponse(success=True, data=summary)
        
    except Exception as e:
        return ApiResponse(success=False, error=str(e))
